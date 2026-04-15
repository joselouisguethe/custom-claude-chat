"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { setCachedAnthropicModel } from "@/lib/anthropic-model-cache";

export default function SettingsPage() {
  const [anthropicModel, setAnthropicModel] = useState("");
  const [savedModel, setSavedModel] = useState("");
  const [role, setRole] = useState<"user" | "super_admin">("user");
  const [status, setStatus] = useState<"pending" | "approved">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canSave = useMemo(
    () => anthropicModel.trim().length > 0 && anthropicModel !== savedModel && !isSaving,
    [anthropicModel, savedModel, isSaving],
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setError("");
        const response = await fetch("/api/settings");
        const data = (await response.json()) as {
          anthropicModel?: string;
          role?: "user" | "super_admin";
          status?: "pending" | "approved";
          error?: string;
        };
        if (!response.ok || !data.anthropicModel) {
          throw new Error(data.error ?? "Failed to load settings.");
        }
        setAnthropicModel(data.anthropicModel);
        setSavedModel(data.anthropicModel);
        setCachedAnthropicModel(data.anthropicModel);
        if (data.role) setRole(data.role);
        if (data.status) setStatus(data.status);
      } catch (loadError) {
        const nextMessage =
          loadError instanceof Error ? loadError.message : "Failed to load settings.";
        setError(nextMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ anthropicModel }),
      });
      const data = (await response.json()) as { anthropicModel?: string; error?: string };
      if (!response.ok || !data.anthropicModel) {
        throw new Error(data.error ?? "Failed to save settings.");
      }
      setAnthropicModel(data.anthropicModel);
      setSavedModel(data.anthropicModel);
      setCachedAnthropicModel(data.anthropicModel);
      setMessage("Settings saved.");
    } catch (saveError) {
      const nextMessage =
        saveError instanceof Error ? saveError.message : "Failed to save settings.";
      setError(nextMessage);
    } finally {
      setIsSaving(false);
    }
  };

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
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">Workspace settings are stored in Supabase.</p>
              <Link
                href="/chat"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Back to chat
              </Link>
            </div>

            <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Anthropic model
                </p>
                <input
                  value={anthropicModel}
                  onChange={(event) => setAnthropicModel(event.target.value)}
                  placeholder="claude-opus-4-6"
                  className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <p>
                  Role: <span className="font-medium text-slate-800">{role}</span>
                </p>
                <p>
                  Approval status: <span className="font-medium text-slate-800">{status}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!canSave}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save settings"}
                </button>
                {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
