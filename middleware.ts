import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/converter/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/pending-approval",
    "/sign-in",
    "/sign-up",
    "/api/chat",
    "/api/sessions/:path*",
    "/api/settings",
    "/api/admin/:path*",
  ],
};
