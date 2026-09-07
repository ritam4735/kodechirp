// gateway/src/services/testGen/generators/generatorRegistry.js
'use strict';

const {
  generateInteger,
  generateLong,
  generateFloat,
  generateBoolean,
  generateCharacter,
  generateString,
} = require('./primitiveGenerators');
const { generateArray, generateMatrix } = require('./collectionGenerators');
const { generateLinkedList, generateBinaryTree } = require('./structureGenerators');

/**
 * Generates a parameter value conforming to type and category.
 *
 * @param {string} type
 * @param {string} category
 * @param {number} idx
 * @param {() => number} rng
 * @param {{ minVal?: number, maxVal?: number, minLen?: number, maxLen?: number }} bounds
 * @returns {*}
 */
function generateParamValue(type, category, idx, rng, bounds = {}) {
  const normType = type ? type.trim() : 'Integer';

  if (normType === 'Integer' || normType === 'Int') {
    return generateInteger(category, idx, rng, bounds);
  }

  if (normType === 'Long' || normType === 'Int64') {
    return generateLong(category, idx, rng, bounds);
  }

  if (normType === 'Float' || normType === 'Double') {
    return generateFloat(category, idx, rng, bounds);
  }

  if (normType === 'Boolean') {
    return generateBoolean(category, idx);
  }

  if (normType === 'Character' || normType === 'Char') {
    return generateCharacter(category, idx, rng);
  }

  if (normType === 'String') {
    return generateString(category, idx, rng, bounds);
  }

  if (normType.startsWith('Array<') && normType.endsWith('>')) {
    const innerType = normType.slice(6, -1).trim();
    return generateArray(innerType, category, idx, rng, bounds);
  }

  if (normType.startsWith('Matrix<') && normType.endsWith('>')) {
    const innerType = normType.slice(7, -1).trim();
    return generateMatrix(innerType, category, idx, rng, bounds);
  }

  if (normType === 'LinkedList') {
    return generateLinkedList(category, idx, rng, bounds);
  }

  if (normType === 'BinaryTree') {
    return generateBinaryTree(category, idx, rng, bounds);
  }

  // Fallback for custom or unknown types
  return generateInteger(category, idx, rng, bounds);
}

module.exports = {
  generateParamValue,
};
