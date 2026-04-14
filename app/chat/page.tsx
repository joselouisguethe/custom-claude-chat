"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppHeader } from "@/components/app-header";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const nowId = () => `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState("");

  const canSend = useMemo(
    () => Boolean(prompt.trim()) && !isLoading && Boolean(activeSessionId),
    [prompt, isLoading, activeSessionId],
  );

  const createNewSession = async () => {
    const response = await fetch("/api/sessions", { method: "POST" });
    const data = (await response.json()) as {
      session?: ChatSession;
      error?: string;
    };
    if (!response.ok || !data.session) {
      throw new Error(data.error ?? "Failed to create session.");
    }
    setSessions((prev) => [data.session!, ...prev]);
    setActiveSessionId(data.session.id);
    setMessages([]);
  };

  const loadSession = async (sessionId: string) => {
    const response = await fetch(`/api/sessions/${sessionId}`);
    const data = (await response.json()) as {
      session?: ChatSession;
      messages?: Message[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load session.");
    }
    setActiveSessionId(data.session?.id ?? sessionId);
    setMessages(data.messages ?? []);
  };

  const refreshSessions = async () => {
    const response = await fetch("/api/sessions");
    const data = (await response.json()) as {
      sessions?: ChatSession[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load sessions.");
    }
    const items = data.sessions ?? [];
    setSessions(items);
    return items;
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const items = await refreshSessions();
        if (!isMounted) return;
        if (items.length === 0) {
          await createNewSession();
          return;
        }
        await loadSession(items[0].id);
      } catch (bootError) {
        const message =
          bootError instanceof Error ? bootError.message : "Bootstrap failed.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isLoading || !activeSessionId) {
      return;
    }

    setError("");
    const userMessage: Message = {
      id: nowId(),
      role: "user",
      content: trimmedPrompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt, sessionId: activeSessionId }),
      });

      const data = (await response.json()) as {
        message?: Message;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Request failed.");
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      await refreshSessions();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unexpected request error.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: nowId(),
          role: "assistant",
          content:
            "I could not reach the API. Please verify your env headers and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameSession = async (session: ChatSession) => {
    const nextTitle = window.prompt("Rename session", session.title)?.trim();
    if (!nextTitle) {
      return;
    }

    const response = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    });
    const data = (await response.json()) as {
      session?: ChatSession;
      error?: string;
    };
    if (!response.ok || !data.session) {
      setError(data.error ?? "Rename failed.");
      return;
    }
    setSessions((prev) =>
      prev.map((item) => (item.id === session.id ? data.session! : item)),
    );
  };

  const handleDeleteSession = async (sessionId: string) => {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Delete failed.");
      return;
    }

    const nextSessions = sessions.filter((item) => item.id !== sessionId);
    setSessions(nextSessions);

    if (activeSessionId === sessionId) {
      if (nextSessions.length > 0) {
        await loadSession(nextSessions[0].id);
      } else {
        await createNewSession();
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <AppHeader />

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,270px)_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-2xl border border-slate-200 bg-[#f3eee4] p-3 md:sticky md:top-[5.5rem] md:h-[calc(100vh-7rem)]">
            <button
              type="button"
              onClick={createNewSession}
              className="mb-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              + New chat
            </button>

            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => loadSession(session.id)}
                  className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeSessionId === session.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "bg-transparent text-slate-700 hover:bg-white/70"
                  }`}
                >
                  <div className="truncate font-medium">{session.title}</div>
                  <div className="mt-1 flex gap-2 text-xs text-slate-500">
                    <span
                      className="cursor-pointer hover:text-slate-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleRenameSession(session);
                      }}
                    >
                      Rename
                    </span>
                    <span
                      className="cursor-pointer hover:text-red-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteSession(session.id);
                      }}
                    >
                      Delete
                    </span>
                  </div>
                </button>
              ))}
            </div>

          </aside>

          <section className="relative flex min-h-[80vh] min-w-0 flex-col">
            <div className="mb-3 min-w-0 flex-1 space-y-4 overflow-x-hidden rounded-2xl border border-slate-200 bg-white/70 p-4 pb-36">
              {isBootstrapping ? (
                <article className="mr-auto w-full max-w-[min(100%,36rem)] rounded-2xl bg-[#f4efe6] px-4 py-3 text-sm text-slate-700 shadow-sm">
                  Loading your chats...
                </article>
              ) : null}
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[min(100%,40rem)] rounded-2xl px-4 py-3 text-sm break-words [overflow-wrap:anywhere] ${
                    message.role === "user"
                      ? "ml-auto w-fit whitespace-pre-wrap bg-[#d97757] text-white"
                      : "mr-auto min-w-0 w-full bg-[#f4efe6] text-slate-900 shadow-sm"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="markdown-content min-w-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </article>
              ))}
              {isLoading ? (
                <article className="mr-auto w-full max-w-[min(100%,40rem)] rounded-2xl bg-[#f4efe6] px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Claude is thinking...
                </article>
              ) : null}
            </div>

            <form
              onSubmit={handleSubmit}
              className="sticky bottom-0 z-20 mt-auto min-w-0 rounded-2xl border border-slate-300 bg-white p-3 shadow-sm"
            >
              <label htmlFor="chatInput" className="sr-only">
                Message
              </label>
              <textarea
                id="chatInput"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Message Claude..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Powered by Anthropic Messages API
                </span>
                <button
                  type="submit"
                  disabled={!canSend}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
              {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
