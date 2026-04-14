import Link from "next/link";
import { AppHeader } from "@/components/app-header";
export default function HomePage() {
  const cards = [
    {
      title: "Claude Chat",
      description:
        "Open your AI assistant with saved Supabase chat sessions and markdown rendering.",
      href: "/chat",
      cta: "Go to Chat",
    },
    {
      title: "Text Converter",
      description:
        "Convert escaped API text into clean, readable markdown-style output instantly.",
      href: "/converter",
      cta: "Open Converter",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <AppHeader />

        <div className="space-y-4">
          <aside className="rounded-2xl border border-slate-200 bg-[#f3eee4] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </p>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">
              Choose your tool
            </h1>
            <p className="text-sm text-slate-600">
              Start a persistent Claude-style conversation or transform escaped
              content into readable output.
            </p>
          </aside>

          <section className="min-h-[50vh] rounded-2xl border border-slate-200 bg-white/70 p-5">
            <div className="grid gap-5 md:grid-cols-2">
              {cards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h2 className="mb-1 text-2xl font-semibold tracking-tight">
                      {card.title}
                    </h2>
                    <p className="text-sm text-slate-600">{card.description}</p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition group-hover:bg-slate-700">
                    {card.cta}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
