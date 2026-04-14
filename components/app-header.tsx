"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AppHeader() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState<"user" | "super_admin">("user");

  const avatarLabel = useMemo(
    () => (userEmail ? userEmail.slice(0, 1).toUpperCase() : "U"),
    [userEmail],
  );

  useEffect(() => {
    const readUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? "");
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role === "super_admin") {
          setRole("super_admin");
        }
      }
    };
    void readUser();
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      window.addEventListener("mousedown", onClickOutside);
    }

    return () => {
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
          C
        </span>
        <span className="text-sm font-semibold tracking-tight">Claude Workspace</span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Home
        </Link>
        <Link
          href="/chat"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Chat
        </Link>
        <Link
          href="/converter"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Converter
        </Link>
        {role === "super_admin" ? (
          <Link
            href="/users"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            Users
          </Link>
        ) : null}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#d97757] text-sm font-semibold text-white"
            aria-label="Open user menu"
          >
            {avatarLabel}
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-md">
              <Link
                href="/settings"
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
