import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FALLBACK_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-6";

const normalizeModel = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 120) : FALLBACK_MODEL;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("anthropic_model,role,status")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    anthropicModel: data.anthropic_model ?? FALLBACK_MODEL,
    role: data.role,
    status: data.status,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    anthropicModel?: string;
  };
  const anthropicModel = normalizeModel(body.anthropicModel);

  const { data, error } = await supabase
    .from("profiles")
    .update({ anthropic_model: anthropicModel })
    .eq("id", user.id)
    .select("anthropic_model")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    anthropicModel: data.anthropic_model ?? FALLBACK_MODEL,
  });
}
