import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server misconfiguration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email.length < 4 || password.length < 6) {
    return NextResponse.json(
      { error: "Enter a valid email and a password of at least 6 characters." },
      { status: 400 },
    );
  }

  const confirmImmediately =
    process.env.SUPABASE_REQUIRE_EMAIL_CONFIRMATION !== "true";

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: confirmImmediately,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const user = created.user;
  if (!user?.id) {
    return NextResponse.json({ error: "Sign up failed." }, { status: 500 });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const isSuperAdmin = Boolean(superAdminEmail && email.toLowerCase() === superAdminEmail);

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? email,
      ...(isSuperAdmin ? { role: "super_admin", status: "approved" } : {}),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, canSignInImmediately: confirmImmediately });
}
