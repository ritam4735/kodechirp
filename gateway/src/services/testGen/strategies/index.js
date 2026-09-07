// gateway/src/services/testGen/strategies/index.js
'use strict';

const { generateNormal } = require('./normalStrategy');
const { generateBoundary } = require('./boundaryStrategy');
const { generateCorner } = require('./cornerStrategy');
const { generateRandomized } = require('./randomizedStrategy');
const { generateStress } = require('./stressStrategy');
const { generatePathological } = require('./pathologicalStrategy');

const STRATEGIES = {
  normal: generateNormal,
  boundary: generateBoundary,
  corner: generateCorner,
  randomized: generateRandomized,
  stress: generateStress,
  pathological: generatePathological,
};

const CATEGORIES = ['normal', 'boundary', 'corner', 'randomized', 'stress', 'pathological'];

/**
 * Dispatches test case input generation to the designated category strategy.
 *
 * @param {string} category
 * @param {Array} params
 * @param {boolean} isFunctionMode
 * @param {number} idx
 * @param {() => number} rng
 * @param {Object} bounds
 * @param {Array|null} lineStructure
 * @returns {{ input?: string, input_json?: Object, category: string, description: string }}
 */
function generateStrategyInput(category, params, isFunctionMode, idx, rng, bounds, lineStructure = null) {
  const normCat = String(category || 'normal').toLowerCase();
  const strategyFn = STRATEGIES[normCat] || STRATEGIES.normal;
  return strategyFn(params, isFunctionMode, idx, rng, bounds, lineStructure);
}

module.exports = {
  CATEGORIES,
  STRATEGIES,
  generateStrategyInput,
  generateNormal,
  generateBoundary,
  generateCorner,
  generateRandomized,
  generateStress,
  generatePathological,
};
