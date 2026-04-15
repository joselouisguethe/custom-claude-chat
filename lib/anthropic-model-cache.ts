/**
 * Client-only cache for the user's Anthropic model id (from GET /api/settings).
 * Avoids repeated Supabase reads on each chat message; refresh via Settings or bootstrap.
 */

const STORAGE_KEY = "claude-prompt:anthropic-model";

export function getCachedAnthropicModel(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)?.trim();
    return raw ? raw.slice(0, 120) : null;
  } catch {
    return null;
  }
}

export function setCachedAnthropicModel(model: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = model.trim().slice(0, 120);
    if (!trimmed) return;
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // ignore quota / private mode
  }
}

export function clearCachedAnthropicModel(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** If nothing is cached yet, load from GET /api/settings once and store locally. */
export async function ensureAnthropicModelCache(): Promise<void> {
  if (typeof window === "undefined") return;
  if (getCachedAnthropicModel()) return;
  try {
    const response = await fetch("/api/settings");
    const data = (await response.json()) as {
      anthropicModel?: string;
      error?: string;
    };
    if (response.ok && data.anthropicModel) {
      setCachedAnthropicModel(data.anthropicModel);
    }
  } catch {
    // leave uncached; chat API will use server fallback
  }
}
