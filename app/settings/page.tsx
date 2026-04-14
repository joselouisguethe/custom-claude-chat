import Link from "next/link";
import { AppHeader } from "@/components/app-header";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <AppHeader />

        <div className="space-y-4">
          <aside className="rounded-2xl border border-slate-200 bg-[#f3eee4] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </p>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-slate-600">
              Configure your workspace preferences and account options.
            </p>
          </aside>

          <section className="min-h-[50vh] rounded-2xl border border-slate-200 bg-white/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Settings panel is ready for your future preferences.
              </p>
              <Link
                href="/chat"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Back to chat
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
