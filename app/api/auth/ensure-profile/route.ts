import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const verifier = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await verifier.auth.getUser(token);

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server misconfiguration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const email = (user.email ?? "").trim();
  const isSuperAdmin = Boolean(
    superAdminEmail && email.toLowerCase() === superAdminEmail,
  );

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      ...(isSuperAdmin ? { role: "super_admin", status: "approved" } : {}),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
