import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

const normalizeSuperAdminEmail = () =>
  process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? null;

const profileAccessGate = async (
  supabase: ReturnType<typeof createServerClient>,
  user: User,
  superAdminEmailNorm: string | null,
) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("status,role")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role ?? "").trim();
  const status = String(profile?.status ?? "").trim();
  const emailNorm = user.email?.trim().toLowerCase() ?? "";

  const isSuperAdmin =
    role === "super_admin" ||
    Boolean(superAdminEmailNorm && emailNorm === superAdminEmailNorm);
  const isApproved = status === "approved";

  return { isSuperAdmin, isApproved };
};

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({
    request,
  });

  const superAdminEmailNorm = normalizeSuperAdminEmail();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/sign-in") ||
    request.nextUrl.pathname.startsWith("/sign-up");
  const isPendingRoute = request.nextUrl.pathname.startsWith("/pending-approval");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/chat") ||
    request.nextUrl.pathname.startsWith("/converter") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/users") ||
    request.nextUrl.pathname.startsWith("/api/chat") ||
    request.nextUrl.pathname.startsWith("/api/sessions") ||
    request.nextUrl.pathname.startsWith("/api/settings") ||
    request.nextUrl.pathname.startsWith("/api/admin");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (!user && isProtectedRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const { isApproved, isSuperAdmin } = await profileAccessGate(
      supabase,
      user,
      superAdminEmailNorm,
    );
    const url = request.nextUrl.clone();
    url.pathname = isApproved || isSuperAdmin ? "/chat" : "/pending-approval";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { isApproved, isSuperAdmin } = await profileAccessGate(
      supabase,
      user,
      superAdminEmailNorm,
    );

    if (!isApproved && !isSuperAdmin && isProtectedRoute) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Your account is waiting for admin approval." },
          { status: 403 },
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/pending-approval";
      return NextResponse.redirect(url);
    }

    if ((isApproved || isSuperAdmin) && isPendingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/chat";
      return NextResponse.redirect(url);
    }

    if (request.nextUrl.pathname.startsWith("/users") && !isSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/chat";
      return NextResponse.redirect(url);
    }
  }

  if (!user && isPendingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return response;
};
