import Link from "next/link";
import { AppHeader } from "@/components/app-header";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <AppHeader />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <Link
            href="/chat"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            Back to chat
          </Link>
        </div>
        <p className="text-sm text-slate-600">
          Settings panel is ready for your future preferences.
        </p>
      </div>
      </div>
    </main>
  );
}
