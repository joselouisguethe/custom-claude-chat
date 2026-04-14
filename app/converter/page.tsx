"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";

const decodeReadableContent = (value: string): string => {
  if (!value) {
    return "";
  }

  let decoded = value;

  decoded = decoded
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

  return decoded;
};

export default function ConverterPage() {
  const [rawContent, setRawContent] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const readableContent = decodeReadableContent(rawContent);

  const handleCopy = async () => {
    if (!readableContent.trim()) {
      setCopyMessage("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(readableContent);
      setCopyMessage("Readable content copied to clipboard.");
    } catch {
      setCopyMessage("Copy failed. Please copy manually.");
    }
  };

  const handleClear = () => {
    setRawContent("");
    setCopyMessage("");
  };

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <AppHeader />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[270px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-[#f3eee4] p-4 md:sticky md:top-[5.5rem] md:h-[calc(100vh-7rem)]">
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">
              Text Converter
            </h1>
            <p className="text-sm text-slate-600">
              Paste escaped content and instantly decode line breaks, quotes, and
              unicode escapes into readable text.
            </p>
          </aside>

          <section className="min-h-[80vh] rounded-2xl border border-slate-200 bg-white/70 p-5">
            <label
              htmlFor="textInput"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Text input
            </label>
            <textarea
              id="textInput"
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              placeholder="Paste raw escaped text here..."
              rows={12}
              className="mb-4 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Clear
              </button>
              {copyMessage ? (
                <span className="self-center text-sm text-slate-600">
                  {copyMessage}
                </span>
              ) : null}
            </div>

            <h2 className="mb-2 text-lg font-semibold">Readable content</h2>
            <div className="min-h-40 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
              {readableContent || "Your converted readable content will appear here."}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
