// gateway/src/services/testGen/strategies/randomizedStrategy.js
'use strict';

const { generateParamValue } = require('../generators/generatorRegistry');
const { generateStdinInput } = require('../generators/stdinGenerators');
const { correlateParameters } = require('./correlator');

/**
 * Generates a randomized test case input with uniform pseudo-random distributions across the valid domain.
 */
function generateRandomized(params, isFunctionMode, idx, rng, bounds, lineStructure = null) {
  if (isFunctionMode) {
    const inputObj = {};
    for (const p of params) {
      inputObj[p.name] = generateParamValue(p.type, 'randomized', idx, rng, bounds);
    }
    correlateParameters(inputObj, params, 'randomized', rng, bounds);
    return {
      input_json: inputObj,
      category: 'randomized',
      description: `Randomized test case #${idx + 1}`,
    };
  }

  return {
    input: generateStdinInput('randomized', idx, rng, bounds, lineStructure),
    category: 'randomized',
    description: `Randomized STDIN test case #${idx + 1}`,
  };
}

module.exports = {
  generateRandomized,
};
