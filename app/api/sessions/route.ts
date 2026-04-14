import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const toTitle = (value?: string) => {
  if (!value) {
    return "New chat";
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.slice(0, 120) || "New chat";
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
    .from("chat_sessions")
    .select("id,title,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const title = toTitle(body.title);

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: user.id,
      title,
    })
    .select("id,title,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
