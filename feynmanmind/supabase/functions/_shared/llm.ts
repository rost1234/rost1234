/**
 * Provider-agnostic structured-output client (OpenAI or Gemini).
 *
 * Env:
 *   LLM_PROVIDER   'openai' (default) | 'gemini'
 *   LLM_MODEL      optional override of the default model for the provider
 *   OPENAI_API_KEY / GEMINI_API_KEY
 */
import { HttpError } from './http.ts';

export interface StructuredRequest<T> {
  /** Schema name, [a-zA-Z0-9_-]. */
  name: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  /** Validates/normalises the parsed JSON; throw to reject. */
  parse: (raw: unknown) => T;
  temperature?: number;
  maxOutputTokens?: number;
}

export type StructuredLlm = <T>(req: StructuredRequest<T>) => Promise<T>;

export class LlmError extends HttpError {
  constructor(message: string) {
    super(502, message, 'llm_error');
    this.name = 'LlmError';
  }
}

type Provider = 'openai' | 'gemini';

export interface LlmConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  /** Used for the retry when the main model is overloaded or unavailable. */
  fallbackModel?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Waits between retries; injectable so tests don't sleep. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  // Google points new projects at the 3.x models; 2.5 is limited to existing users.
  gemini: 'gemini-3.8-flash',
};

// The main Gemini model often answers 503 "high demand"; the lighter model keeps working.
const DEFAULT_FALLBACK_MODELS: Partial<Record<Provider, string>> = {
  gemini: 'gemini-3.5-flash-lite',
};

export function llmConfigFromEnv(): LlmConfig {
  const provider = (Deno.env.get('LLM_PROVIDER') ?? 'openai') as Provider;
  if (provider !== 'openai' && provider !== 'gemini') {
    throw new Error(`Unsupported LLM_PROVIDER ${provider}`);
  }
  const keyName = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
  const apiKey = Deno.env.get(keyName);
  if (!apiKey) throw new Error(`Missing environment variable ${keyName}`);
  return {
    provider,
    apiKey,
    model: Deno.env.get('LLM_MODEL') ?? DEFAULT_MODELS[provider],
    fallbackModel: Deno.env.get('LLM_FALLBACK_MODEL') ?? DEFAULT_FALLBACK_MODELS[provider],
  };
}

/** HTTP status that is worth one retry. */
class RetryableError extends Error {}

export function createStructuredLlm(config: LlmConfig): StructuredLlm {
  const fetchImpl = config.fetchImpl ?? fetch;
  const sleep = config.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const timeoutMs = config.timeoutMs ?? 45_000;

  async function callOnce(req: StructuredRequest<unknown>, model: string, legacyGemini = false): Promise<string> {
    const { url, headers, body } =
      config.provider === 'openai' ? openAiRequest(config, model, req) : geminiRequest(config, model, req, legacyGemini);

    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new RetryableError(`network error: ${(err as Error).message}`);
    }

    if (res.status === 429 || res.status >= 500) {
      throw new RetryableError(`provider returned ${res.status}`);
    }
    const payload = await res.json().catch(() => null);
    // Gemini: if the current structured-output fields are rejected, try the
    // older (deprecated but long-supported) ones once before giving up.
    if (res.status === 400 && config.provider === 'gemini' && !legacyGemini) {
      console.warn('[llm] gemini rejected responseFormat, retrying with legacy schema fields');
      return callOnce(req, model, true);
    }
    if (!res.ok) {
      console.error('[llm] provider error', res.status, JSON.stringify(payload)?.slice(0, 500));
      throw new LlmError(`AI provider rejected the request (${res.status})`);
    }
    return config.provider === 'openai' ? openAiText(payload) : geminiText(payload);
  }

  return async function generate<T>(req: StructuredRequest<T>): Promise<T> {
    let lastError: unknown;
    // Up to 2 attempts: one retry on transient errors or malformed output.
    // When the main model is overloaded, the retry goes to the fallback model.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(800);
      const model = attempt > 0 && lastError instanceof RetryableError && config.fallbackModel ? config.fallbackModel : config.model;
      try {
        const text = await callOnce(req as StructuredRequest<unknown>, model);
        return req.parse(JSON.parse(text));
      } catch (err) {
        if (err instanceof LlmError) throw err;
        lastError = err;
        console.warn(`[llm] ${req.name} attempt ${attempt + 1} failed:`, (err as Error).message);
      }
    }
    throw new LlmError(
      lastError instanceof RetryableError
        ? 'AI provider is unavailable, try again shortly'
        : 'AI returned an invalid response',
    );
  };
}

function openAiRequest(config: LlmConfig, model: string, req: StructuredRequest<unknown>) {
  return {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: {
      model,
      temperature: req.temperature ?? 0.3,
      max_completion_tokens: req.maxOutputTokens ?? 2000,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: req.name, strict: true, schema: req.schema },
      },
    },
  };
}

function openAiText(payload: any): string {
  const message = payload?.choices?.[0]?.message;
  if (message?.refusal) throw new LlmError('AI declined to answer this request');
  if (typeof message?.content !== 'string') throw new Error('missing message content');
  return message.content;
}

function geminiRequest(config: LlmConfig, model: string, req: StructuredRequest<unknown>, legacy: boolean) {
  const output = legacy
    ? { responseMimeType: 'application/json', responseJsonSchema: req.schema }
    : { responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: req.schema } } };
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    headers: { 'x-goog-api-key': config.apiKey },
    body: {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.user }] }],
      generationConfig: {
        temperature: req.temperature ?? 0.3,
        maxOutputTokens: req.maxOutputTokens ?? 2000,
        ...output,
      },
    },
  };
}

function geminiText(payload: any): string {
  if (payload?.promptFeedback?.blockReason) throw new LlmError('AI declined to answer this request');
  const parts = payload?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('') : '';
  if (!text) throw new Error('missing candidate text');
  return text;
}
