import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ClaudeContentBlock = {
  type: string;
  text?: string;
};

type ClaudeApiResponse = {
  content?: ClaudeContentBlock[];
  error?: {
    message?: string;
  };
};

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const toTitle = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, 120) || "New chat";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const anthropicVersion = process.env.ANTHROPIC_VERSION;
  const anthropicBeta = process.env.ANTHROPIC_BETA;
  const fallbackModel = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-6";

  if (!apiKey || !anthropicVersion || !anthropicBeta) {
    return NextResponse.json(
      {
        error:
          "Missing Anthropic env config. Set ANTHROPIC_API_KEY, ANTHROPIC_VERSION, and ANTHROPIC_BETA.",
      },
      { status: 500 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("anthropic_model,status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  if (profile.status !== "approved") {
    return NextResponse.json(
      { error: "Your account is waiting for admin approval." },
      { status: 403 },
    );
  }

  const model = profile.anthropic_model?.trim() || fallbackModel;

  let prompt = "";
  let sessionId = "";
  try {
    const body = (await request.json()) as { prompt?: string; sessionId?: string };
    prompt = body.prompt?.trim() ?? "";
    sessionId = body.sessionId?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!prompt || !sessionId) {
    return NextResponse.json(
      { error: "Prompt and sessionId are required." },
      { status: 400 },
    );
  }

  const { data: ownedSession, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id,title")
    .eq("id", sessionId)
    .single();

  if (sessionError || !ownedSession) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const { error: userInsertError } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content: prompt,
  });

  if (userInsertError) {
    return NextResponse.json({ error: userInsertError.message }, { status: 500 });
  }

  const headers: HeadersInit = {
    "x-api-key": apiKey,
    "anthropic-version": anthropicVersion,
    "anthropic-beta": anthropicBeta,
    "content-type": "application/json",
  };

  const { data: history, error: historyError } = await supabase
    .from("chat_messages")
    .select("role,content,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  const requestBody = {
    model,
    max_tokens: 1024,
    messages: (history ?? []).map((item) => ({
      role: item.role,
      content: item.content,
    })),
  };

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  const data = (await response.json()) as ClaudeApiResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "Anthropic request failed." },
      { status: response.status },
    );
  }

  const text = (data.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");

  const assistantText = text || "I could not generate a response this time.";

  const { data: insertedAssistant, error: assistantInsertError } = await supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      role: "assistant",
      content: assistantText,
    })
    .select("id,role,content,created_at")
    .single();

  if (assistantInsertError) {
    return NextResponse.json(
      { error: assistantInsertError.message },
      { status: 500 },
    );
  }

  if (ownedSession.title === "New chat") {
    await supabase
      .from("chat_sessions")
      .update({ title: toTitle(prompt), updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  } else {
    await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  return NextResponse.json({ message: insertedAssistant });
}
