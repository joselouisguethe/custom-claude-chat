"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";

type UserRow = {
  id: string;
  email: string;
  role: "user" | "super_admin";
  status: "pending" | "approved";
  anthropic_model: string;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setError("");
    const response = await fetch("/api/admin/users");
    const data = (await response.json()) as { users?: UserRow[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load users.");
    }
    setUsers(data.users ?? []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadUsers();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, []);

  const updateUser = async (
    userId: string,
    updates: Partial<Pick<UserRow, "role" | "status">>,
  ) => {
    setError("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, ...updates }),
    });
    const data = (await response.json()) as { user?: UserRow; error?: string };
    if (!response.ok || !data.user) {
      throw new Error(data.error ?? "Failed to update user.");
    }
    setUsers((prev) => prev.map((item) => (item.id === userId ? data.user! : item)));
  };

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <AppHeader />

        <div className="space-y-4">
          <aside className="rounded-2xl border border-slate-200 bg-[#f3eee4] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Users management</h1>
            <p className="text-sm text-slate-600">
              Approve pending users and assign roles.
            </p>
          </aside>

          <section className="min-h-[50vh] rounded-2xl border border-slate-200 bg-white/70 p-5">
            {isLoading ? <p className="text-sm text-slate-600">Loading users...</p> : null}
            {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

            <div className="space-y-3">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-medium text-slate-900">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">Model: {user.anthropic_model}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="text-sm text-slate-600">
                      Role{" "}
                      <select
                        value={user.role}
                        onChange={(event) =>
                          void updateUser(user.id, {
                            role: event.target.value as UserRow["role"],
                          })
                        }
                        className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                      >
                        <option value="user">user</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    </label>

                    <label className="text-sm text-slate-600">
                      Status{" "}
                      <select
                        value={user.status}
                        onChange={(event) =>
                          void updateUser(user.id, {
                            status: event.target.value as UserRow["status"],
                          })
                        }
                        className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                      >
                        <option value="pending">pending</option>
                        <option value="approved">approved</option>
                      </select>
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
