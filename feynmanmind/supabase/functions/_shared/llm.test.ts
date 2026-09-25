import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { createStructuredLlm, LlmError, type StructuredRequest } from './llm.ts';

type Reply = { status: number; body: unknown };

function fakeFetch(replies: Reply[]) {
  const calls: { url: string; body: any; headers: Record<string, string> }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(init.body as string), headers: init.headers as Record<string, string> });
    const r = replies[Math.min(calls.length - 1, replies.length - 1)];
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const req: StructuredRequest<{ ok: boolean }> = {
  name: 'test',
  system: 'sys',
  user: 'usr',
  schema: { type: 'object' },
  parse: (raw) => {
    if (typeof (raw as { ok?: unknown }).ok !== 'boolean') throw new Error('bad');
    return raw as { ok: boolean };
  },
};

const openAiOk = (content: string): Reply => ({ status: 200, body: { choices: [{ message: { content } }] } });
const noSleep = () => Promise.resolve();

Deno.test('openai: sends strict json_schema and parses content', async () => {
  const f = fakeFetch([openAiOk('{"ok":true}')]);
  const llm = createStructuredLlm({ provider: 'openai', apiKey: 'k', model: 'm', fetchImpl: f.impl, sleep: noSleep });
  assertEquals(await llm(req), { ok: true });
  assertEquals(f.calls[0].url, 'https://api.openai.com/v1/chat/completions');
  assertEquals(f.calls[0].headers.Authorization, 'Bearer k');
  assertEquals(f.calls[0].body.response_format.json_schema.strict, true);
  assertEquals(f.calls[0].body.messages[0], { role: 'system', content: 'sys' });
});

const geminiOk: Reply = { status: 200, body: { candidates: [{ content: { parts: [{ text: '{"ok":' }, { text: 'false}' }] } }] } };

Deno.test('gemini: uses systemInstruction + responseFormat JSON schema', async () => {
  const f = fakeFetch([geminiOk]);
  const llm = createStructuredLlm({ provider: 'gemini', apiKey: 'g', model: 'gemini-x', fetchImpl: f.impl, sleep: noSleep });
  assertEquals(await llm(req), { ok: false });
  assertEquals(f.calls[0].url.endsWith('/models/gemini-x:generateContent'), true);
  assertEquals(f.calls[0].headers['x-goog-api-key'], 'g');
  assertEquals(f.calls[0].body.generationConfig.responseFormat.text, { mimeType: 'APPLICATION_JSON', schema: { type: 'object' } });
  assertEquals(f.calls[0].body.systemInstruction.parts[0].text, 'sys');
});

Deno.test('gemini: falls back to legacy schema fields once on 400', async () => {
  const f = fakeFetch([{ status: 400, body: { error: { message: 'Unknown name "responseFormat"' } } }, geminiOk]);
  const llm = createStructuredLlm({ provider: 'gemini', apiKey: 'g', model: 'gemini-x', fetchImpl: f.impl, sleep: noSleep });
  assertEquals(await llm(req), { ok: false });
  assertEquals(f.calls.length, 2);
  assertEquals(f.calls[1].body.generationConfig.responseMimeType, 'application/json');
  assertEquals(f.calls[1].body.generationConfig.responseJsonSchema, { type: 'object' });
});

Deno.test('retries once on 5xx, then succeeds', async () => {
  const f = fakeFetch([{ status: 503, body: {} }, openAiOk('{"ok":true}')]);
  const llm = createStructuredLlm({ provider: 'openai', apiKey: 'k', model: 'm', fetchImpl: f.impl, sleep: noSleep });
  assertEquals(await llm(req), { ok: true });
  assertEquals(f.calls.length, 2);
});

Deno.test('retries once on invalid output, then gives up with LlmError', async () => {
  const f = fakeFetch([openAiOk('{"nope":1}')]);
  const llm = createStructuredLlm({ provider: 'openai', apiKey: 'k', model: 'm', fetchImpl: f.impl, sleep: noSleep });
  await assertRejects(() => llm(req), LlmError, 'invalid response');
  assertEquals(f.calls.length, 2);
});

Deno.test('4xx is not retried', async () => {
  const f = fakeFetch([{ status: 400, body: { error: 'bad' } }]);
  const llm = createStructuredLlm({ provider: 'openai', apiKey: 'k', model: 'm', fetchImpl: f.impl, sleep: noSleep });
  await assertRejects(() => llm(req), LlmError, '400');
  assertEquals(f.calls.length, 1);
});

Deno.test('refusal surfaces as LlmError without retry', async () => {
  const f = fakeFetch([{ status: 200, body: { choices: [{ message: { refusal: 'no' } }] } }]);
  const llm = createStructuredLlm({ provider: 'openai', apiKey: 'k', model: 'm', fetchImpl: f.impl, sleep: noSleep });
  await assertRejects(() => llm(req), LlmError, 'declined');
  assertEquals(f.calls.length, 1);
});
