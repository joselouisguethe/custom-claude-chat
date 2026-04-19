"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppHeader } from "@/components/app-header";
import {
  ensureAnthropicModelCache,
  getCachedAnthropicModel,
} from "@/lib/anthropic-model-cache";

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

  const scrollToThinkingAfterCtrlEnterRef = useRef(false);
  const thinkingStatusRef = useRef<HTMLElement | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const [transcriptHasOverflow, setTranscriptHasOverflow] = useState(false);

  const scrollTranscriptToBottom = useCallback(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const updateTranscriptOverflow = useCallback(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    setTranscriptHasOverflow(el.scrollHeight > el.clientHeight + 1);
  }, []);

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
        await ensureAnthropicModelCache();
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

  useEffect(() => {
    if (!isLoading || !scrollToThinkingAfterCtrlEnterRef.current) {
      return;
    }
    scrollToThinkingAfterCtrlEnterRef.current = false;
    const el = thinkingStatusRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el?.focus({ preventScroll: true });
  }, [isLoading]);

  useLayoutEffect(() => {
    scrollTranscriptToBottom();
  }, [messages, isLoading, scrollTranscriptToBottom]);

  useLayoutEffect(() => {
    updateTranscriptOverflow();
  }, [messages, isLoading, isBootstrapping, updateTranscriptOverflow]);

  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      updateTranscriptOverflow();
    });
    ro.observe(el);
    el.addEventListener("scroll", updateTranscriptOverflow, { passive: true });
    window.addEventListener("resize", updateTranscriptOverflow);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateTranscriptOverflow);
      window.removeEventListener("resize", updateTranscriptOverflow);
    };
  }, [updateTranscriptOverflow]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isLoading || !activeSessionId) {
      scrollToThinkingAfterCtrlEnterRef.current = false;
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
      await ensureAnthropicModelCache();
      const anthropicModel = getCachedAnthropicModel() ?? undefined;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          sessionId: activeSessionId,
          anthropicModel,
        }),
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

  const handleChatInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || !event.ctrlKey) {
      return;
    }
    event.preventDefault();
    if (!canSend) {
      return;
    }
    scrollToThinkingAfterCtrlEnterRef.current = true;
    event.currentTarget.form?.requestSubmit();
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
    <main className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[#f9f7f4] text-slate-900">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-6">
        <AppHeader />

        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,270px)_minmax(0,1fr)] md:grid-rows-1">
          <aside className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200 bg-[#f3eee4] p-3 md:h-full">
            <button
              type="button"
              onClick={createNewSession}
              className="mb-3 w-full shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              + New chat
            </button>

            <div className="scrollbar-none min-h-0 max-h-[40vh] space-y-2 overflow-y-auto md:max-h-none md:flex-1">
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

          <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="relative mb-3 flex min-h-0 min-w-0 flex-1 flex-col">
              <div
                ref={transcriptScrollRef}
                className="chat-transcript-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white/70 p-4"
              >
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
                  <article
                    ref={thinkingStatusRef}
                    tabIndex={-1}
                    className="mr-auto w-full max-w-[min(100%,40rem)] rounded-2xl bg-[#f4efe6] px-4 py-3 text-sm text-slate-500 shadow-sm"
                  >
                    Claude is thinking...
                  </article>
                ) : null}
              </div>
              {transcriptHasOverflow ? (
                <div className="pointer-events-none absolute top-1/2 right-2 z-10 flex -translate-y-1/2 flex-col gap-1">
                  <button
                    type="button"
                    className="pointer-events-auto rounded-lg border border-slate-200 bg-white/95 p-1.5 text-slate-700 shadow-sm transition hover:bg-white"
                    aria-label="Scroll chat to top"
                    onClick={() => {
                      transcriptScrollRef.current?.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a.75.75 0 01.53.22l4.5 4.5a.75.75 0 11-1.06 1.06L10 5.31 6.03 8.78a.75.75 0 11-1.06-1.06l4.5-4.5A.75.75 0 0110 3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="pointer-events-auto rounded-lg border border-slate-200 bg-white/95 p-1.5 text-slate-700 shadow-sm transition hover:bg-white"
                    aria-label="Scroll chat to bottom"
                    onClick={() => {
                      const el = transcriptScrollRef.current;
                      if (!el) return;
                      el.scrollTo({
                        top: el.scrollHeight,
                        behavior: "smooth",
                      });
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 17a.75.75 0 01-.53-.22l-4.5-4.5a.75.75 0 111.06-1.06L10 14.69l3.97-3.47a.75.75 0 111.06 1.06l-4.5 4.5A.75.75 0 0110 17z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ) : null}
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-auto min-w-0 shrink-0 rounded-2xl border border-slate-300 bg-white p-3 shadow-sm"
            >
              <label htmlFor="chatInput" className="sr-only">
                Message
              </label>
              <textarea
                id="chatInput"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleChatInputKeyDown}
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
