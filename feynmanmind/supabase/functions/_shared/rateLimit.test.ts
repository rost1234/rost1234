import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { HttpError } from './http.ts';
import { clientKey, createRateLimiter } from './rateLimit.ts';

Deno.test('allows up to the limit per key within the window, then 429', () => {
  let t = 0;
  const check = createRateLimiter(2, 1000, () => t);
  check('a');
  check('a');
  check('b'); // other clients unaffected
  const err = assertThrows(() => check('a'), HttpError);
  assertEquals(err.status, 429);
  t = 1001; // window slid past
  check('a');
});

Deno.test('clientKey uses the first forwarded address', () => {
  const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } });
  assertEquals(clientKey(req), '1.2.3.4');
});
