/** Shared Anthropic model id normalization (settings + chat API). */

export const FALLBACK_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-opus-4-6";

export function normalizeAnthropicModel(value?: string | null): string {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 120) : FALLBACK_ANTHROPIC_MODEL;
}
