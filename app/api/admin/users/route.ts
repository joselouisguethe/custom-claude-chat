import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const isRole = (value: string): value is "user" | "super_admin" =>
  value === "user" || value === "super_admin";

const isStatus = (value: string): value is "pending" | "approved" =>
  value === "pending" || value === "approved";

const ensureSuperAdmin = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "super_admin") {
    return {
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (profile.status !== "approved") {
    return {
      errorResponse: NextResponse.json(
        { error: "Waiting for approval." },
        { status: 403 },
      ),
    };
  }

  return { supabase };
};

export async function GET() {
  const access = await ensureSuperAdmin();
  if ("errorResponse" in access) {
    return access.errorResponse;
  }

  const { supabase } = access;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role,status,anthropic_model,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function PATCH(request: Request) {
  const access = await ensureSuperAdmin();
  if ("errorResponse" in access) {
    return access.errorResponse;
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    role?: string;
    status?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const updatePayload: { role?: "user" | "super_admin"; status?: "pending" | "approved" } =
    {};

  if (typeof body.role === "string") {
    if (!isRole(body.role)) {
      return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
    }
    updatePayload.role = body.role;
  }

  if (typeof body.status === "string") {
    if (!isStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }
    updatePayload.status = body.status;
  }

  if (!updatePayload.role && !updatePayload.status) {
    return NextResponse.json(
      { error: "At least one of role or status is required." },
      { status: 400 },
    );
  }

  const { supabase } = access;
  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", body.userId)
    .select("id,email,role,status,anthropic_model,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
