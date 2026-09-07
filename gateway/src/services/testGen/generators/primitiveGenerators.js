// gateway/src/services/testGen/generators/primitiveGenerators.js
'use strict';

const { randInt, choice } = require('../prng');

function normalizeCategory(category) {
  const cat = String(category || 'normal').toLowerCase();
  if (cat === 'min_edge' || cat === 'max_edge') return 'boundary';
  if (cat === 'corner_case') return 'corner';
  if (cat.startsWith('random')) return 'randomized';
  if (cat === 'duplicate_heavy' || cat === 'adversarial') return 'pathological';
  if (['normal', 'boundary', 'corner', 'randomized', 'stress', 'pathological'].includes(cat)) return cat;
  return 'normal';
}

function generateInteger(category, idx, rng, bounds) {
  const minV = bounds.minVal ?? -100;
  const maxV = bounds.maxVal ?? 100;
  const rawCat = String(category).toLowerCase();

  // Direct backwards-compatibility presets for legacy categories
  if (rawCat === 'min_edge') return [0, 1, -1, Math.max(minV, -1000), 2][idx % 5];
  if (rawCat === 'max_edge') return [Math.min(maxV, 1000), Math.min(maxV, 1000) - 1, Math.floor(maxV / 2)][idx % 3];
  if (rawCat === 'corner_case') return [0, 1, -1, 2, 1024, -1024, 42][idx % 7];
  if (rawCat === 'duplicate_heavy') return [5, 5, 0, 0, 1][idx % 5];
  if (rawCat === 'adversarial') return [Math.min(maxV, 10000), Math.max(minV, -10000), 0][idx % 3];
  if (rawCat === 'random_small') return randInt(-10, 10, rng);
  if (rawCat === 'random_medium') return randInt(-100, 100, rng);
  if (rawCat === 'random_large') return randInt(Math.max(minV, -1000), Math.min(maxV, 1000), rng);

  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary': {
      const boundaryValues = [minV, maxV, 0, 1, -1, 2147483647, -2147483648];
      const valid = boundaryValues.filter(v => v >= minV && v <= maxV);
      return valid.length > 0 ? valid[idx % valid.length] : minV;
    }
    case 'corner':
      return [0, 1, -1, 2, 1024, -1024, 42][idx % 7];
    case 'stress':
      return idx % 2 === 0 ? maxV : minV;
    case 'pathological':
      return [maxV, minV, 0, maxV - 1, minV + 1][idx % 5];
    case 'randomized':
      return randInt(minV, maxV, rng);
    case 'normal':
    default: {
      const low = Math.max(minV, -50);
      const high = Math.min(maxV, 50);
      return low <= high ? randInt(low, high, rng) : randInt(minV, maxV, rng);
    }
  }
}

function generateLong(category, idx, rng, bounds) {
  const minV = bounds.minVal ?? -2147483648;
  const maxV = bounds.maxVal ?? 2147483647;
  const rawCat = String(category).toLowerCase();

  // Direct backwards-compatibility presets for legacy categories
  if (rawCat === 'min_edge') return [0, 1, -1, -2147483648, 2147483647][idx % 5];
  if (rawCat === 'max_edge') return [9007199254740991, -9007199254740991, 1000000000000][idx % 3];
  if (rawCat === 'corner_case') return [0, 1, -1, 2147483648, -2147483649, 10000000000][idx % 6];
  if (rawCat === 'duplicate_heavy') return [1000000000, 1000000000, 0, 0, -1000000000][idx % 5];
  if (rawCat === 'adversarial') return [2147483647, -2147483648, 100000000000][idx % 3];
  if (rawCat === 'random_small') return randInt(-1000, 1000, rng);
  if (rawCat === 'random_medium') return randInt(-1000000, 1000000, rng);
  if (rawCat === 'random_large') return randInt(100000000, 2000000000, rng);

  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary':
      return [9007199254740991, -9007199254740991, 2147483647, -2147483648, 0, 1, -1][idx % 7];
    case 'corner':
      return [0, 1, -1, 2147483648, -2147483649, 10000000000][idx % 6];
    case 'stress':
      return idx % 2 === 0 ? 9007199254740991 : -9007199254740991;
    case 'pathological':
      return [2147483647, -2147483648, 100000000000][idx % 3];
    case 'randomized':
      return randInt(-1000000000, 1000000000, rng);
    case 'normal':
    default:
      return randInt(-100000, 100000, rng);
  }
}

function generateFloat(category, idx, rng, bounds) {
  const minV = bounds.minVal ?? -100;
  const maxV = bounds.maxVal ?? 100;
  const rawCat = String(category).toLowerCase();

  if (rawCat === 'min_edge') return [0.0, 1.0, -1.0, 0.001][idx % 4];
  if (rawCat === 'max_edge') return parseFloat((Math.min(maxV, 1000) * 1.0).toFixed(2));
  if (rawCat === 'corner_case') return [0.0, 3.14159, -1.0, 2.718][idx % 4];
  if (rawCat === 'random_small') return parseFloat((rng() * 20 - 10).toFixed(2));
  if (rawCat === 'random_medium') return parseFloat((rng() * 200 - 100).toFixed(2));

  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary':
      return [0.0, 1.0, -1.0, 0.0001, parseFloat(maxV.toFixed(2)), parseFloat(minV.toFixed(2))][idx % 6];
    case 'corner':
      return [0.0, -0.0, 3.14159, -1.0, 2.71828, 1e-6][idx % 6];
    case 'stress':
      return parseFloat((idx % 2 === 0 ? maxV : minV).toFixed(4));
    case 'pathological':
      return [1e-9, -1e-9, 999999.99, -999999.99][idx % 4];
    case 'randomized':
      return parseFloat((rng() * (maxV - minV) + minV).toFixed(4));
    case 'normal':
    default:
      return parseFloat((rng() * 100 - 50).toFixed(2));
  }
}

function generateBoolean(category, idx) {
  const rawCat = String(category).toLowerCase();
  if (rawCat === 'min_edge') return false;
  if (rawCat === 'max_edge') return true;
  return idx % 2 === 0;
}

function generateCharacter(category, idx, rng) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()[]{} ';
  const rawCat = String(category).toLowerCase();
  if (rawCat === 'min_edge') return 'a';
  if (rawCat === 'corner_case') return ['(', ')', ' ', '0', 'z'][idx % 5];

  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary':
      return idx % 2 === 0 ? 'a' : 'z';
    case 'corner':
      return ['\0', ' ', '\n', '0', 'z', '!', '~'][idx % 7];
    case 'stress':
    case 'pathological':
      return 'x';
    case 'randomized':
    case 'normal':
    default:
      return chars[randInt(0, chars.length - 1, rng)];
  }
}

function generateString(category, idx, rng, bounds) {
  const maxL = Math.min(bounds.maxLen ?? 100, 300);
  const minL = Math.max(bounds.minLen ?? 0, 0);
  const rawCat = String(category).toLowerCase();

  if (rawCat === 'min_edge') return idx === 0 ? (minL === 0 ? '' : 'a'.repeat(minL)) : 'a'.repeat(Math.max(1, minL));
  if (rawCat === 'corner_case') {
    const presets = ['', 'a', '()', '()[]{}', '(]', '((()))', 'a b c', '12345', '!!!', '([)]', 'racecar', 'A man, a plan, a canal: Panama'];
    return presets[idx % presets.length];
  }
  if (rawCat === 'duplicate_heavy') {
    const char = choice(['a', 'x', '(', '0'], rng);
    return char.repeat(randInt(10, 40, rng));
  }
  if (rawCat === 'adversarial') {
    return '('.repeat(20) + ')'.repeat(19);
  }

  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary': {
      if (idx % 2 === 0) {
        return minL === 0 ? '' : 'a'.repeat(minL);
      }
      return 'z'.repeat(Math.min(maxL, 100));
    }
    case 'corner': {
      const presets = ['', ' ', 'a', '0', '()[]{}', 'racecar', '!@#$%^&*()', '1234567890'];
      return presets[idx % presets.length];
    }
    case 'stress': {
      const stressLen = Math.min(maxL, 500);
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      let str = '';
      for (let i = 0; i < stressLen; i++) str += chars[i % 26];
      return str;
    }
    case 'pathological': {
      // Degenerate string patterns: all same character, or alternating
      return idx % 2 === 0 ? 'a'.repeat(Math.min(maxL, 80)) : 'ab'.repeat(Math.min(Math.floor(maxL / 2), 40));
    }
    case 'randomized': {
      const len = randInt(Math.max(1, minL), Math.min(maxL, 50), rng);
      const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let res = '';
      for (let i = 0; i < len; i++) res += charset[randInt(0, charset.length - 1, rng)];
      return res;
    }
    case 'normal':
    default: {
      const len = randInt(Math.max(3, minL), Math.min(maxL, 20), rng);
      const charset = 'abcdefghijklmnopqrstuvwxyz';
      let res = '';
      for (let i = 0; i < len; i++) res += charset[randInt(0, charset.length - 1, rng)];
      return res;
    }
  }
}

module.exports = {
  normalizeCategory,
  generateInteger,
  generateLong,
  generateFloat,
  generateBoolean,
  generateCharacter,
  generateString,
};
