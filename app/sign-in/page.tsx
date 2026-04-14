"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 6 && !isLoading,
    [email, password, isLoading],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      await fetch("/api/auth/ensure-profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }

    const nextPath = searchParams.get("next") || "/chat";
    router.replace(nextPath);
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9f7f4] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-slate-600">
          Continue to your saved Claude-style chat sessions.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
        <p className="mt-4 text-sm text-slate-600">
          No account?{" "}
          <Link className="text-blue-600 underline" href="/sign-up">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f9f7f4] p-4 text-slate-600">
          Loading…
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
