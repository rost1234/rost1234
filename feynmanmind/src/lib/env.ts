/**
 * Where the AI Edge Functions live. Optional: without it the app works fully
 * offline (library, manual cards, reviews) and only the AI features are off.
 * `EXPO_PUBLIC_*` must be read with literal property access for inlining.
 */
export const aiBaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
export const aiKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isAiConfigured = /^https?:\/\//.test(aiBaseUrl) && aiKey.length > 0;
