import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FALLBACK_ANTHROPIC_MODEL,
  normalizeAnthropicModel,
} from "@/lib/anthropic-model";

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
    anthropicModel: data.anthropic_model ?? FALLBACK_ANTHROPIC_MODEL,
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
  const anthropicModel = normalizeAnthropicModel(body.anthropicModel);

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
    anthropicModel: data.anthropic_model ?? FALLBACK_ANTHROPIC_MODEL,
  });
}
