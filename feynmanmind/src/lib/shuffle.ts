/** Small deterministic hash (FNV-1a) so a question always shuffles the same way. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Returns option indices in a stable pseudo-random order for `seed`, so the
 * correct answer isn't always in the same position (authored content lists
 * it first) while re-renders keep the same order.
 */
export function shuffledIndices(count: number, seed: string): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  let state = hash(seed) || 1;
  for (let i = count - 1; i > 0; i--) {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}
