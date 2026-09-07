// gateway/src/services/testGen/prng.js
'use strict';

/**
 * Converts a string into a 32-bit positive integer seed.
 * @param {string} str
 * @returns {number}
 */
function stringToSeed(str) {
  let hash = 0;
  if (!str) return 42;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 42;
}

/**
 * Creates a deterministic pseudo-random number generator (Mulberry32).
 * Returns a function that outputs floats in [0, 1).
 * @param {number|string} seed
 * @returns {() => number}
 */
function createPRNG(seed) {
  let s = typeof seed === 'string' ? stringToSeed(seed) : Math.abs(Number(seed)) || 12345;

  return function random() {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates an integer in [min, max] inclusive using the provided PRNG.
 * @param {number} min
 * @param {number} max
 * @param {() => number} rng
 * @returns {number}
 */
function randInt(min, max, rng = Math.random) {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (low === high) return low;
  return Math.floor(rng() * (high - low + 1)) + low;
}

/**
 * Picks a random item from an array.
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng
 * @returns {T}
 */
function choice(arr, rng = Math.random) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Shuffles an array in place (Fisher-Yates) using the provided PRNG.
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng
 * @returns {T[]}
 */
function shuffle(arr, rng = Math.random) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Samples n random elements without replacement.
 * @template T
 * @param {T[]} arr
 * @param {number} n
 * @param {() => number} rng
 * @returns {T[]}
 */
function sample(arr, n, rng = Math.random) {
  if (!arr || arr.length === 0) return [];
  const shuffled = shuffle(arr, rng);
  return shuffled.slice(0, Math.min(n, arr.length));
}

module.exports = {
  stringToSeed,
  createPRNG,
  randInt,
  choice,
  shuffle,
  sample,
};
