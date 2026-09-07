// gateway/src/services/testGen/strategies/pathologicalStrategy.js
'use strict';

const { generateParamValue } = require('../generators/generatorRegistry');
const { generateStdinInput } = require('../generators/stdinGenerators');
const { correlateParameters } = require('./correlator');

/**
 * Generates a pathological / adversarial test case input
 * (anti-quicksort sorted arrays, all-identical elements, alternating extreme signs, deep degeneracies).
 */
function generatePathological(params, isFunctionMode, idx, rng, bounds, lineStructure = null) {
  if (isFunctionMode) {
    const inputObj = {};
    for (const p of params) {
      inputObj[p.name] = generateParamValue(p.type, 'pathological', idx, rng, bounds);
    }
    correlateParameters(inputObj, params, 'pathological', rng, bounds);
    return {
      input_json: inputObj,
      category: 'pathological',
      description: `Pathological adversarial case #${idx + 1}`,
    };
  }

  return {
    input: generateStdinInput('pathological', idx, rng, bounds, lineStructure),
    category: 'pathological',
    description: `Pathological STDIN adversarial case #${idx + 1}`,
  };
}

module.exports = {
  generatePathological,
};
