// gateway/src/services/testGen/constraintParser.js
'use strict';

/**
 * Parses constraint strings (including LaTeX notation, unicode, and exponential formats)
 * into numeric bounds for generators.
 *
 * @param {Array<string>|null} constraintsJson
 * @param {string|null} constraintsStr
 * @returns {{
 *   minVal: number,
 *   maxVal: number,
 *   minLen: number,
 *   maxLen: number,
 *   minTarget: number|null,
 *   maxTarget: number|null,
 *   paramBounds: Object.<string, { minVal?: number, maxVal?: number, minLen?: number, maxLen?: number }>
 * }}
 */
function parseConstraintsBounds(constraintsJson, constraintsStr) {
  const bounds = {
    minVal: -100,
    maxVal: 100,
    minLen: 1,
    maxLen: 100,
    minTarget: null,
    maxTarget: null,
    allowedValues: null,
    paramBounds: {},
  };

  let text = (Array.isArray(constraintsJson) ? constraintsJson.join(' ') : '') + ' ' + (constraintsStr || '');
  if (!text.trim()) return bounds;

  // Normalize LaTeX and unicode notation
  text = text
    .replace(/\\le\b/g, '<=')
    .replace(/\\ge\b/g, '>=')
    .replace(/\\leq\b/g, '<=')
    .replace(/\\geq\b/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/\$/g, '')
    .replace(/\{(\d+)\}/g, '$1');

  // Detect discrete value sets (e.g. x ∈ {0,1}, x in {0,1}, belongs to, either 0 or 1, binary grid)
  const setMatch = text.match(/(?:in|belongs\s+to|\u2208)\s*\{\s*(-?\d+)\s*,\s*(-?\d+)\s*\}/i) ||
                   text.match(/\{\s*(-?\d+)\s*,\s*(-?\d+)\s*\}/);
  if (setMatch) {
    const v1 = parseInt(setMatch[1], 10);
    const v2 = parseInt(setMatch[2], 10);
    if (!isNaN(v1) && !isNaN(v2)) {
      bounds.allowedValues = [Math.min(v1, v2), Math.max(v1, v2)];
      bounds.minVal = bounds.allowedValues[0];
      bounds.maxVal = bounds.allowedValues[1];
    }
  } else if (
    /(?:either\s+0\s+or\s+1|values\s+(?:are|in)\s+0\s+or\s+1|elements\s+(?:are|in)\s+0\s+or\s+1|binary\s+(?:matrix|grid|array|image|board)|boolean\s+(?:matrix|grid))/i.test(text)
  ) {
    bounds.allowedValues = [0, 1];
    bounds.minVal = 0;
    bounds.maxVal = 1;
  }

  const parseNumber = (s) => {
    if (!s) return NaN;
    const str = s.trim().replace(/,/g, '');
    if (str.includes('2^31-1') || str.includes('2^{31}-1')) return 2147483647;
    if (str.includes('-2^31') || str.includes('-2^{31}')) return -2147483648;
    if (str.includes('2^31') || str.includes('2^{31}')) return 2147483648;
    if (str.includes('2^63-1') || str.includes('2^{63}-1')) return 9223372036854775807;
    if (str.includes('-2^63') || str.includes('-2^{63}')) return -9223372036854775808;

    if (str.includes('^')) {
      const isNeg = str.startsWith('-');
      const cleanStr = isNeg ? str.slice(1) : str;
      const parts = cleanStr.split('^');
      const b = Number(parts[0]);
      let e = parts[1];
      let sub = 0;
      if (e.includes('-')) {
        const subParts = e.split('-');
        e = Number(subParts[0]);
        sub = Number(subParts[1]) || 0;
      } else {
        e = Number(e);
      }
      const val = Math.pow(b, e) - sub;
      return isNeg ? -val : val;
    }
    if (/^[-+]?\d*\.?\d+[eE][-+]?\d+$/.test(str)) {
      return parseFloat(str);
    }
    return parseInt(str, 10);
  };

  // 1. Match Value Ranges: e.g. -10^4 <= nums[i] <= 10^4 or -1000 <= val <= 1000
  const valRangeRegex = /(-?\d+(?:\^\d+(?:-\d+)?|e[+-]?\d+)?)\s*(?:<=|<)\s*([a-zA-Z0-9_\[\]\.]+)\s*(?:<=|<)\s*(-?\d+(?:\^\d+(?:-\d+)?|e[+-]?\d+)?)/gi;
  let match;
  while ((match = valRangeRegex.exec(text)) !== null) {
    const low = parseNumber(match[1]);
    const varName = match[2].toLowerCase();
    const high = parseNumber(match[3]);

    if (!isNaN(low) && !isNaN(high)) {
      if (
        varName.includes('length') ||
        varName.includes('len') ||
        varName.includes('size') ||
        varName === 'n' ||
        varName === 'm'
      ) {
        if (low >= 0) bounds.minLen = low;
        if (high > 0) bounds.maxLen = high;
      } else if (varName.includes('target') || varName.includes('k') || varName.includes('val2')) {
        bounds.minTarget = low;
        bounds.maxTarget = high;
      } else {
        bounds.minVal = low;
        bounds.maxVal = high;
      }

      const baseParam = varName.split('.')[0].split('[')[0];
      if (baseParam) {
        if (!bounds.paramBounds[baseParam]) bounds.paramBounds[baseParam] = {};
        if (varName.includes('length') || varName.includes('len') || varName.includes('size')) {
          bounds.paramBounds[baseParam].minLen = Math.max(0, low);
          bounds.paramBounds[baseParam].maxLen = high;
        } else {
          bounds.paramBounds[baseParam].minVal = low;
          bounds.paramBounds[baseParam].maxVal = high;
        }
      }
    }
  }

  // 2. Match Length / Size Ranges: e.g. 1 <= nums.length <= 10^5 or 0 <= length <= 5000
  const lenRangeRegex = /(\d+(?:\^\d+|e[+-]?\d+)?)\s*(?:<=|<)\s*(?:(?:[a-zA-Z0-9_]+\.)?(?:length|len|size|nodes|n|s))\s*(?:<=|<)\s*(\d+(?:\^\d+|e[+-]?\d+)?)/gi;
  while ((match = lenRangeRegex.exec(text)) !== null) {
    const low = parseNumber(match[1]);
    const high = parseNumber(match[2]);
    if (!isNaN(low) && low >= 0) bounds.minLen = low;
    if (!isNaN(high) && high > 0) bounds.maxLen = high;
  }

  // 3. Fallback for single upper bound lengths: e.g. n <= 10^5, nums.length <= 5000
  const singleLenRegex = /(?:length|len|nodes|n|size|s)\s*(?:<=|<)\s*(\d+(?:\^\d+|e[+-]?\d+)?)/gi;
  while ((match = singleLenRegex.exec(text)) !== null) {
    const maxL = parseNumber(match[1]);
    if (!isNaN(maxL) && maxL > 0) bounds.maxLen = maxL;
  }

  return bounds;
}

module.exports = {
  parseConstraintsBounds,
};
