"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PendingApprovalPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9f7f4] p-4 text-slate-900">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Waiting for approval</h1>
        <p className="mb-6 text-sm text-slate-600">
          Your account was created successfully. A super admin must approve your access before
          you can use the workspace.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Sign out
          </button>
          <Link
            href="/sign-in"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
