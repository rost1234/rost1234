/**
 * POST /functions/v1/delete-account
 * Body:     { "confirm": "DELETE" }
 * Response: { deleted: true }
 *
 * Deletes the caller's auth user. Every table references auth.users with
 * ON DELETE CASCADE, so all of the user's data goes with it.
 * Backs "Delete all my data" in Settings; the app then starts a fresh anonymous user.
 */
import { handle, HttpError, json, readJsonBody } from '../_shared/http.ts';
import { getAdminClient, getUserClient } from '../_shared/supabase.ts';

const admin = getAdminClient();

Deno.serve(handle(async (req) => {
  const { userId } = await getUserClient(req);
  const body = await readJsonBody(req, 1024);
  if (body.confirm !== 'DELETE') {
    throw new HttpError(400, 'Send { "confirm": "DELETE" } to delete the account', 'invalid_input');
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[delete-account]', error.message);
    throw new HttpError(500, 'Could not delete the account', 'internal');
  }
  return json({ deleted: true });
}));
