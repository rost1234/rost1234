import { usePrefsStore } from '@/state/prefsStore';

/**
 * Where the AI Edge Functions live. Set in Settings (saved on the device), or
 * at build time via EXPO_PUBLIC_* (read with literal access so they inline).
 * Optional: without it everything except the AI features works offline.
 */
const buildUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const buildKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export interface AiConfig {
  url: string;
  key: string;
}

export const normalizeAiUrl = (url: string) => url.trim().replace(/\/+$/, '');
const valid = (c: AiConfig) => /^https?:\/\/\S+$/.test(c.url) && c.key.trim().length > 0;

export function aiConfigFrom(prefs: { aiUrl: string; aiKey: string }): AiConfig | null {
  const saved = { url: normalizeAiUrl(prefs.aiUrl), key: prefs.aiKey.trim() };
  if (valid(saved)) return saved;
  const built = { url: normalizeAiUrl(buildUrl), key: buildKey };
  return valid(built) ? built : null;
}

export const getAiConfig = () => aiConfigFrom(usePrefsStore.getState());

/** Hook: whether AI features can be used right now. */
export function useAiConfigured(): boolean {
  const aiUrl = usePrefsStore((s) => s.aiUrl);
  const aiKey = usePrefsStore((s) => s.aiKey);
  return aiConfigFrom({ aiUrl, aiKey }) !== null;
}
