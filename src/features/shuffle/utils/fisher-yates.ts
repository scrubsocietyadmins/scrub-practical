/**
 * Pure Fisher-Yates (Knuth) Shuffle algorithm.
 * Guarantees unbiased O(n) permutation.
 * Accepts an optional pseudo-random number generator function (returning [0, 1))
 * for deterministic testing and reproducible shuffles.
 */
export function fisherYatesShuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * High-performance Mulberry32 PRNG generator for deterministic pseudo-random numbers.
 * Converts string or numeric seed to a 32-bit state.
 */
export function createDeterministicPrng(seed: string | number): () => number {
  let s: number;
  if (typeof seed === 'string') {
    // FNV-1a 32-bit hash of string
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    s = h >>> 0;
  } else {
    s = Math.floor(seed) >>> 0;
  }

  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
