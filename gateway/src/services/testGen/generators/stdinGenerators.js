// gateway/src/services/testGen/generators/stdinGenerators.js
'use strict';

const { randInt } = require('../prng');

/**
 * Infers input line structure from existing example test cases.
 * @param {Array<string>} parsedExamples
 * @returns {Array<{ count: number, isNum: boolean }>|null}
 */
function inferLineStructure(parsedExamples) {
  if (!parsedExamples || parsedExamples.length === 0) return null;
  const first = parsedExamples[0];
  if (typeof first !== 'string' || !first.trim()) return null;

  const lines = first.trim().split('\n');
  return lines.map(l => {
    const tokens = l.trim().split(/\s+/).filter(Boolean);
    return {
      count: tokens.length,
      isNum: tokens.length > 0 && tokens.every(t => !isNaN(Number(t))),
    };
  });
}

/**
 * Generates an input string for STDIN_STDOUT mode conforming to category and inferred structure.
 *
 * @param {string} category
 * @param {number} idx
 * @param {() => number} rng
 * @param {Object} bounds
 * @param {Array<{ count: number, isNum: boolean }>|null} lineStructure
 * @returns {string}
 */
function generateStdinInput(category, idx, rng, bounds, lineStructure = null) {
  const minV = bounds.minVal ?? -100;
  const maxV = bounds.maxVal ?? 100;
  const minL = Math.max(bounds.minLen ?? 1, 1);
  const maxL = Math.min(bounds.maxLen ?? 100, 300);

  // If we have an inferred line structure (e.g., line 0 is N, line 1 is array of N items)
  if (lineStructure && lineStructure.length > 0) {
    const lines = [];
    for (let lIdx = 0; lIdx < lineStructure.length; lIdx++) {
      const spec = lineStructure[lIdx];

      // Pattern: First line is single integer N, followed by line of N elements
      if (lIdx === 0 && lineStructure.length > 1 && spec.count === 1 && spec.isNum) {
        let nVal = 5;
        if (category === 'boundary') {
          nVal = [minL, Math.min(maxL, 10), Math.min(maxL, 100), Math.max(minL, minL + 1)][idx % 4];
        } else if (category === 'corner') {
          nVal = Math.min(maxL, Math.max(minL, (idx % 4) + 1));
        } else if (category === 'stress') {
          nVal = Math.min(maxL, 150 + (idx % 50));
        } else if (category === 'pathological') {
          nVal = Math.min(maxL, 20 + (idx % 15));
        } else if (category === 'randomized') {
          nVal = randInt(Math.max(2, minL), Math.min(maxL, 40), rng);
        } else {
          // normal
          nVal = randInt(Math.max(3, minL), Math.min(maxL, 15), rng);
        }

        lines.push(String(nVal));

        if (lineStructure[1]) {
          const arr = [];
          for (let k = 0; k < nVal; k++) {
            let v = randInt(minV, maxV, rng);
            if (category === 'pathological') {
              v = idx % 2 === 0 ? maxV : (k % 2 === 0 ? maxV : minV);
            } else if (category === 'boundary') {
              v = (k + idx) % 2 === 0 ? minV : maxV;
            } else if (category === 'corner') {
              const cornerVals = [0, -1, 1, minV, maxV, 42, 100];
              v = cornerVals[(k + idx) % cornerVals.length];
            }
            arr.push(v);
          }
          lines.push(arr.join(' '));
          lIdx++; // Handled the array line
        }
      } else {
        const tokens = [];
        for (let t = 0; t < spec.count; t++) {
          if (spec.isNum) {
            tokens.push(randInt(minV, maxV, rng));
          } else {
            tokens.push('val' + t);
          }
        }
        lines.push(tokens.join(' '));
      }
    }
    return lines.join('\n');
  }

  // Fallback if no structure could be inferred
  switch (category) {
    case 'boundary':
      return idx % 2 === 0 ? String(minV) : String(maxV);
    case 'corner': {
      const presets = ['0', '1', '-1', '10 20 30', '0 0 0'];
      return presets[idx % presets.length];
    }
    case 'stress': {
      const n = Math.min(maxL, 200);
      const arr = Array.from({ length: n }, () => randInt(minV, maxV, rng));
      return `${n}\n${arr.join(' ')}`;
    }
    case 'pathological': {
      const n = 30;
      const arr = Array.from({ length: n }, () => maxV);
      return `${n}\n${arr.join(' ')}`;
    }
    case 'randomized': {
      const n = randInt(Math.max(2, minL), Math.min(maxL, 30), rng);
      const arr = Array.from({ length: n }, () => randInt(minV, maxV, rng));
      return `${n}\n${arr.join(' ')}`;
    }
    case 'normal':
    default: {
      const n = randInt(Math.max(3, minL), Math.min(maxL, 10), rng);
      const arr = Array.from({ length: n }, () => randInt(-50, 50, rng));
      return `${n}\n${arr.join(' ')}`;
    }
  }
}

module.exports = {
  inferLineStructure,
  generateStdinInput,
};
