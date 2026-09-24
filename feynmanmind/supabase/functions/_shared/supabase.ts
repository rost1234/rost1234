import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';

export type { SupabaseClient };

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * Client that acts as the caller: every query goes through RLS with the
 * caller's JWT, so ownership checks come from the database, not from this code.
 */
export async function getUserClient(req: Request): Promise<{ client: SupabaseClient; userId: string }> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing bearer token', 'unauthorized');
  }
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(authorization.slice('Bearer '.length));
  if (error || !data.user) throw new HttpError(401, 'Invalid or expired token', 'unauthorized');
  return { client, userId: data.user.id };
}

/** Service-role client. Bypasses RLS — use only for server-owned writes. */
export function getAdminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Turns a PostgREST error into a logged 500 without leaking details. */
export function dbFail(context: string, error: { message: string; code?: string }): never {
  console.error(`[db] ${context}:`, error.code, error.message);
  throw new HttpError(500, 'Database error', 'db_error');
}
