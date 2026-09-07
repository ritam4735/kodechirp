// gateway/src/services/testGen/strategies/stressStrategy.js
'use strict';

const { generateParamValue } = require('../generators/generatorRegistry');
const { generateStdinInput } = require('../generators/stdinGenerators');
const { correlateParameters } = require('./correlator');

/**
 * Generates a stress test case input (large sizes and high-complexity loads to challenge time/space complexity).
 */
function generateStress(params, isFunctionMode, idx, rng, bounds, lineStructure = null) {
  if (isFunctionMode) {
    const inputObj = {};
    for (const p of params) {
      inputObj[p.name] = generateParamValue(p.type, 'stress', idx, rng, bounds);
    }
    correlateParameters(inputObj, params, 'stress', rng, bounds);
    return {
      input_json: inputObj,
      category: 'stress',
      description: `Stress test case #${idx + 1}`,
    };
  }

  return {
    input: generateStdinInput('stress', idx, rng, bounds, lineStructure),
    category: 'stress',
    description: `Stress STDIN test case #${idx + 1}`,
  };
}

module.exports = {
  generateStress,
};
