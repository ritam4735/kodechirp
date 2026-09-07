// gateway/src/services/testGen/strategies/normalStrategy.js
'use strict';

const { generateParamValue } = require('../generators/generatorRegistry');
const { generateStdinInput } = require('../generators/stdinGenerators');
const { correlateParameters } = require('./correlator');

/**
 * Generates a normal (nominal, realistic) test case input.
 */
function generateNormal(params, isFunctionMode, idx, rng, bounds, lineStructure = null) {
  if (isFunctionMode) {
    const inputObj = {};
    for (const p of params) {
      inputObj[p.name] = generateParamValue(p.type, 'normal', idx, rng, bounds);
    }
    correlateParameters(inputObj, params, 'normal', rng, bounds);
    return {
      input_json: inputObj,
      category: 'normal',
      description: `Normal nominal case #${idx + 1}`,
    };
  }

  return {
    input: generateStdinInput('normal', idx, rng, bounds, lineStructure),
    category: 'normal',
    description: `Normal nominal STDIN case #${idx + 1}`,
  };
}

module.exports = {
  generateNormal,
};
