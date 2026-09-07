// gateway/src/services/testGen/strategies/cornerStrategy.js
'use strict';

const { generateParamValue } = require('../generators/generatorRegistry');
const { generateStdinInput } = require('../generators/stdinGenerators');
const { correlateParameters } = require('./correlator');

/**
 * Generates a corner test case input (zeros, single elements, empty structures, edge conditions).
 */
function generateCorner(params, isFunctionMode, idx, rng, bounds, lineStructure = null) {
  if (isFunctionMode) {
    const inputObj = {};
    for (const p of params) {
      inputObj[p.name] = generateParamValue(p.type, 'corner', idx, rng, bounds);
    }
    correlateParameters(inputObj, params, 'corner', rng, bounds);
    return {
      input_json: inputObj,
      category: 'corner',
      description: `Corner edge case #${idx + 1}`,
    };
  }

  return {
    input: generateStdinInput('corner', idx, rng, bounds, lineStructure),
    category: 'corner',
    description: `Corner STDIN edge case #${idx + 1}`,
  };
}

module.exports = {
  generateCorner,
};
