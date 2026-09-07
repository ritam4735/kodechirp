// gateway/src/services/testGen/generators/structureGenerators.js
'use strict';

const { randInt } = require('../prng');
const { normalizeCategory } = require('./primitiveGenerators');

function generateLinkedList(category, idx, rng, bounds) {
  const rawCat = String(category).toLowerCase();
  if (rawCat === 'min_edge') return idx === 0 ? [] : [0];
  if (rawCat === 'corner_case') {
    const presets = [[1, 2, 3, 4, 5], [1], [1, 2], [5, 4, 3, 2, 1], [0, 0, 0]];
    return presets[idx % presets.length];
  }

  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary':
      return idx % 2 === 0 ? [] : [bounds.minVal ?? 0];
    case 'corner': {
      const presets = [[1, 2, 3, 4, 5], [1], [1, 2], [5, 4, 3, 2, 1], [0, 0, 0]];
      return presets[idx % presets.length];
    }
    case 'pathological':
      // Very long list with all duplicates or alternating signs
      return Array.from({ length: 30 }, () => 42);
    case 'stress':
      return Array.from({ length: Math.min(bounds.maxLen ?? 50, 100) }, (_, i) => i);
    case 'randomized':
    case 'normal':
    default: {
      const len = randInt(1, 15, rng);
      return Array.from({ length: len }, () => randInt(-50, 50, rng));
    }
  }
}

function generateBinaryTree(category, idx, rng, bounds) {
  const rawCat = String(category).toLowerCase();
  if (rawCat === 'min_edge') return [];
  if (rawCat === 'corner_case') {
    const presets = [
      [1],
      [1, 2, 3],
      [1, null, 2, null, 3], // Skewed Right
      [3, 2, null, 1],        // Skewed Left
      [1, 2, 2, 3, 4, 4, 3], // Symmetric
    ];
    return presets[idx % presets.length];
  }

  const cat = normalizeCategory(category);
  switch (cat) {
    case 'boundary':
      return idx % 2 === 0 ? [] : [1];
    case 'corner': {
      const presets = [
        [1],
        [1, 2, 3],
        [1, null, 2, null, 3],
        [3, 2, null, 1],
        [1, 2, 2, 3, 4, 4, 3],
      ];
      return presets[idx % presets.length];
    }
    case 'pathological':
      // Completely degenerate tree (e.g. all left or all right like a linked list)
      return [1, null, 2, null, null, null, 3];
    case 'stress': {
      // Complete tree up to depth 4 (15 nodes)
      return Array.from({ length: 15 }, (_, i) => i + 1);
    }
    case 'randomized':
    case 'normal':
    default: {
      const len = randInt(3, 11, rng);
      const tree = [randInt(1, 50, rng)];
      for (let i = 1; i < len; i++) {
        tree.push(rng() < 0.2 ? null : randInt(-50, 50, rng));
      }
      return tree;
    }
  }
}

module.exports = {
  generateLinkedList,
  generateBinaryTree,
};
