// gateway/src/services/testGen/generators/collectionGenerators.js
'use strict';

const { randInt } = require('../prng');
const {
  normalizeCategory,
  generateInteger,
  generateLong,
  generateFloat,
  generateString,
  generateBoolean,
} = require('./primitiveGenerators');

function generateArray(innerType, category, idx, rng, bounds) {
  const normInner = innerType ? innerType.trim() : 'Integer';
  const minL = Math.max(bounds.minLen ?? 0, 0);
  const maxL = Math.min(bounds.maxLen ?? 100, 300);
  const rawCat = String(category).toLowerCase();

  // Legacy presets check
  if (normInner === 'Integer' || normInner === 'Int') {
    if (rawCat === 'min_edge') return [[], [0], [1], [-1], [1, 2]][idx % 5];
    if (rawCat === 'corner_case') {
      const presets = [
        [1, 2, 3, 4, 5],
        [5, 4, 3, 2, 1],
        [0, 0, 0, 0],
        [1, -1, 2, -2],
        [42],
        [100, -100],
        [1, 2, 2, 1],
        [3, 3],
      ];
      return presets[idx % presets.length];
    }
    if (rawCat === 'duplicate_heavy') {
      const len = randInt(10, 30, rng);
      const val = randInt(-10, 10, rng);
      return Array.from({ length: len }, () => val);
    }
    if (rawCat === 'adversarial') {
      const len = randInt(20, 50, rng);
      return Array.from({ length: len }, (_, i) => (i % 2 === 0 ? 100 : -100));
    }
    if (rawCat === 'random_small') {
      const len = randInt(2, 10, rng);
      return Array.from({ length: len }, () => randInt(-50, 50, rng));
    }
    if (rawCat === 'random_medium') {
      const len = randInt(10, 40, rng);
      return Array.from({ length: len }, () => randInt(-50, 50, rng));
    }
    if (rawCat === 'random_large') {
      const len = randInt(40, Math.min(maxL, 150), rng);
      return Array.from({ length: len }, () => randInt(-50, 50, rng));
    }
  }

  if (normInner === 'Long' || normInner === 'Int64') {
    if (rawCat === 'min_edge') {
      return [[], [0], [1], [-1], [1, 2147483648]][idx % 5];
    }
    if (rawCat === 'corner_case') {
      return [[2147483647, -2147483648], [1000000000, 2000000000, 3000000000], [0, 0]][idx % 3];
    }
  }

  if (normInner === 'Float' || normInner === 'Double') {
    if (rawCat === 'min_edge') return [];
  }

  if (normInner === 'String') {
    if (rawCat === 'min_edge') return [];
    if (rawCat === 'corner_case') return [['a'], ['', ''], ['hello', 'world']][idx % 3];
  }

  if (normInner === 'Boolean') {
    if (rawCat === 'min_edge') return [];
  }

  // 6 Core Categories handling
  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary': {
      if (idx % 3 === 0) return minL === 0 ? [] : Array.from({ length: minL }, () => 0);
      if (idx % 3 === 1) return Array.from({ length: Math.max(1, minL) }, () => bounds.minVal ?? -100);
      const len = Math.min(maxL, 100);
      return Array.from({ length: len }, () => bounds.maxVal ?? 100);
    }
    case 'corner': {
      if (normInner === 'Integer' || normInner === 'Int') {
        const presets = [
          [1, 2, 3, 4, 5],
          [5, 4, 3, 2, 1],
          [0, 0, 0, 0],
          [1, -1, 2, -2],
          [42],
          [100, -100],
        ];
        return presets[idx % presets.length];
      }
      return [generatePrimitive(normInner, 'corner', 0, rng, bounds)];
    }
    case 'pathological': {
      // Degenerate / adversarial cases: all duplicates, strictly sorted, or alternating signs
      const len = randInt(20, Math.min(maxL, 100), rng);
      if (idx % 3 === 0) {
        // All duplicates
        const val = bounds.maxVal ?? 7;
        return Array.from({ length: len }, () => val);
      }
      if (idx % 3 === 1) {
        // Strictly ascending (adversarial for naive quicksort / BST)
        return Array.from({ length: len }, (_, i) => i + (bounds.minVal ?? 0));
      }
      // Alternating polarity
      return Array.from({ length: len }, (_, i) => (i % 2 === 0 ? (bounds.maxVal ?? 100) : (bounds.minVal ?? -100)));
    }
    case 'stress': {
      const len = Math.min(maxL, 300);
      return Array.from({ length: len }, (_, i) => generatePrimitive(normInner, 'stress', i, rng, bounds));
    }
    case 'randomized': {
      const len = randInt(Math.max(2, minL), Math.min(maxL, 50), rng);
      return Array.from({ length: len }, (_, i) => generatePrimitive(normInner, 'randomized', i, rng, bounds));
    }
    case 'normal':
    default: {
      const len = randInt(Math.max(3, minL), Math.min(maxL, 20), rng);
      return Array.from({ length: len }, (_, i) => generatePrimitive(normInner, 'normal', i, rng, bounds));
    }
  }
}

function generateMatrix(innerType, category, idx, rng, bounds) {
  const normInner = innerType ? innerType.trim() : 'Integer';
  const rawCat = String(category).toLowerCase();
  const minDim = Math.max(1, bounds?.minLen ?? 1);

  if (rawCat === 'min_edge') {
    return Array.from({ length: minDim }, () =>
      Array.from({ length: minDim }, (_, c) => generatePrimitive(normInner, 'min_edge', c, rng, bounds))
    );
  }

  if (normInner === 'Integer' || normInner === 'Int') {
    if (rawCat === 'corner_case') {
      const d = Math.max(minDim, 2);
      return Array.from({ length: d }, () =>
        Array.from({ length: d }, (_, c) => generatePrimitive(normInner, 'corner_case', c, rng, bounds))
      );
    }
  }

  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary':
      return Array.from({ length: minDim }, () =>
        Array.from({ length: minDim }, (_, c) => generatePrimitive(normInner, 'boundary', c, rng, bounds))
      );
    case 'corner':
      const d = Math.max(minDim, 2);
      return Array.from({ length: d }, () =>
        Array.from({ length: d }, (_, c) => generatePrimitive(normInner, 'corner', c, rng, bounds))
      );
    case 'stress': {
      const rows = 10;
      const cols = 10;
      return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, (_, c) => generatePrimitive(normInner, 'stress', c, rng, bounds))
      );
    }
    case 'pathological': {
      const rows = 6;
      const cols = 6;
      const val = bounds.maxVal ?? 1;
      return Array.from({ length: rows }, () => Array.from({ length: cols }, () => val));
    }
    case 'randomized': {
      const rows = randInt(2, 6, rng);
      const cols = randInt(2, 6, rng);
      return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, (_, c) => generatePrimitive(normInner, 'randomized', c, rng, bounds))
      );
    }
    case 'normal':
    default: {
      const rows = randInt(2, 4, rng);
      const cols = randInt(2, 4, rng);
      return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, (_, c) => generatePrimitive(normInner, 'normal', c, rng, bounds))
      );
    }
  }
}

function generatePrimitive(type, category, idx, rng, bounds) {
  switch (type) {
    case 'Integer':
    case 'Int':
      return generateInteger(category, idx, rng, bounds);
    case 'Long':
    case 'Int64':
      return generateLong(category, idx, rng, bounds);
    case 'Float':
    case 'Double':
      return generateFloat(category, idx, rng, bounds);
    case 'String':
      return generateString(category, idx, rng, bounds);
    case 'Boolean':
      return generateBoolean(category, idx);
    default:
      return generateInteger(category, idx, rng, bounds);
  }
}

module.exports = {
  generateArray,
  generateMatrix,
};
