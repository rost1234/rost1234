/** HTTP plumbing shared by all Edge Functions. */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'error',
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Wraps a POST handler with CORS preflight, method check and error mapping. */
export function handle(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed', 'method_not_allowed');
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: { code: err.code, message: err.message } }, err.status);
      }
      console.error(err);
      return json({ error: { code: 'internal', message: 'Internal server error' } }, 500);
    }
  };
}

export async function readJsonBody(req: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new HttpError(413, 'Request body too large', 'payload_too_large');

  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, 'Request body too large', 'payload_too_large');
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Body must be valid JSON', 'invalid_json');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Body must be a JSON object', 'invalid_body');
  }
  return body as Record<string, unknown>;
}

/** Required string field, trimmed, within [min, max] characters. */
export function requireText(value: unknown, field: string, min: number, max: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min) throw new HttpError(400, `${field} must be at least ${min} characters`, 'invalid_input');
  if (text.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`, 'invalid_input');
  return text;
}

/** Optional list of strings: missing → []; each item trimmed and capped; list capped. */
export function stringList(value: unknown, field: string, maxItems: number, maxLength: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array`, 'invalid_input');
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .slice(-maxItems)
    .map((v) => v.trim().slice(0, maxLength));
}
