/**
 * Public Supabase settings, inlined at build time from .env.local / EAS env.
 * `EXPO_PUBLIC_*` must be read with literal property access for inlining.
 */
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = /^https?:\/\//.test(supabaseUrl) && supabaseKey.length > 0;
