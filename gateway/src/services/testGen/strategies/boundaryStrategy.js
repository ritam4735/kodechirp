// gateway/src/services/testGen/strategies/boundaryStrategy.js
'use strict';

const { generateParamValue } = require('../generators/generatorRegistry');
const { generateStdinInput } = require('../generators/stdinGenerators');
const { correlateParameters } = require('./correlator');

/**
 * Generates a boundary test case input (min/max bounds of constraints).
 */
function generateBoundary(params, isFunctionMode, idx, rng, bounds, lineStructure = null) {
  if (isFunctionMode) {
    const inputObj = {};
    for (const p of params) {
      inputObj[p.name] = generateParamValue(p.type, 'boundary', idx, rng, bounds);
    }
    correlateParameters(inputObj, params, 'boundary', rng, bounds);
    return {
      input_json: inputObj,
      category: 'boundary',
      description: `Boundary limit case #${idx + 1}`,
    };
  }

  return {
    input: generateStdinInput('boundary', idx, rng, bounds, lineStructure),
    category: 'boundary',
    description: `Boundary STDIN limit case #${idx + 1}`,
  };
}

module.exports = {
  generateBoundary,
};
