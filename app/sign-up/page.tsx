"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
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

    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      ok?: boolean;
      canSignInImmediately?: boolean;
    };

    if (!res.ok || !payload.ok) {
      setError(payload.error ?? "Sign up failed.");
      setIsLoading(false);
      return;
    }

    if (payload.canSignInImmediately !== false) {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(
          "Account created, but sign-in failed. Try signing in with your password.",
        );
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
    }

    router.replace("/pending-approval");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9f7f4] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">Create account</h1>
        <p className="mb-6 text-sm text-slate-600">
          Create your account. A super admin must approve access before use.
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
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="text-blue-600 underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
