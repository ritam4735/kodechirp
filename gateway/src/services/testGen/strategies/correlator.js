// gateway/src/services/testGen/strategies/correlator.js
'use strict';

/**
 * Applies smart multi-parameter correlation across generated parameters for FUNCTION mode.
 * E.g., ensures target is reachable or array length matches length parameter.
 *
 * @param {Object} inputObj - The dictionary of paramName -> paramValue
 * @param {Array<{ name: string, type: string }>} params - Problem signature params
 * @param {string} category - Strategy category
 * @param {() => number} rng - PRNG
 * @param {Object} bounds - Parsed constraint bounds
 */
function correlateParameters(inputObj, params, category, rng, bounds) {
  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const randChoice = (arr) => arr[Math.floor(rng() * arr.length)];

  const matrixParam = params.find(p => p.type.startsWith('Matrix'));
  const arrayParam = params.find(p => (p.type.startsWith('Array') || p.type === 'LinkedList') && !p.type.startsWith('Matrix'));
  const intParams = params.filter(p => p.type === 'Integer' || p.type === 'Int' || p.type === 'Long');
  const stringParam = params.find(p => p.type === 'String');

  // Correlate Matrix<T> + Integer(s)
  if (matrixParam && intParams.length > 0) {
    const genMatrixElem = () => {
      if (bounds?.allowedValues && bounds.allowedValues.length > 0) {
        return randChoice(bounds.allowedValues);
      }
      return randInt(bounds?.minVal ?? -10, bounds?.maxVal ?? 10);
    };

    const minDim = Math.max(1, bounds?.minLen ?? 1);
    const maxDim = Math.min(Math.max(minDim, bounds?.maxLen ?? 10), 10);

    const dimKeywords = ['n', 'm', 'rows', 'row', 'r', 'cols', 'col', 'c', 'size', 'len', 'length', 'height', 'h', 'width', 'w', 'dim', 'dimension'];
    const matchingIntParams = intParams.filter(p => dimKeywords.includes(p.name.toLowerCase()));

    if (matchingIntParams.length === 1) {
      const nParam = matchingIntParams[0];
      let n;
      if (category === 'boundary' || category === 'min_edge') n = minDim;
      else if (category === 'stress' || category === 'max_edge') n = maxDim;
      else if (category === 'corner') n = randInt(minDim, Math.min(maxDim, minDim + 2));
      else n = randInt(minDim, maxDim);

      inputObj[nParam.name] = n;
      inputObj[matrixParam.name] = Array.from({ length: n }, () =>
        Array.from({ length: n }, genMatrixElem)
      );
    } else if (matchingIntParams.length >= 2) {
      const rowKeywords = ['rows', 'row', 'r', 'height', 'h', 'm'];
      const colKeywords = ['cols', 'col', 'c', 'width', 'w', 'n'];

      let rowParam = matchingIntParams.find(p => rowKeywords.includes(p.name.toLowerCase()));
      let colParam = matchingIntParams.find(p => colKeywords.includes(p.name.toLowerCase()) && p !== rowParam);

      if (!rowParam || !colParam) {
        rowParam = matchingIntParams[0];
        colParam = matchingIntParams[1];
      }

      let rCount, cCount;
      if (category === 'boundary' || category === 'min_edge') {
        rCount = minDim;
        cCount = minDim;
      } else if (category === 'stress' || category === 'max_edge') {
        rCount = maxDim;
        cCount = maxDim;
      } else {
        rCount = randInt(minDim, maxDim);
        cCount = randInt(minDim, maxDim);
      }

      inputObj[rowParam.name] = rCount;
      inputObj[colParam.name] = cCount;
      inputObj[matrixParam.name] = Array.from({ length: rCount }, () =>
        Array.from({ length: cCount }, genMatrixElem)
      );
    }
  }

  // Correlate Array + Target / Index / Length
  const intParam = intParams[0];
  if (arrayParam && intParam) {
    const arrVal = inputObj[arrayParam.name];
    const paramNameLower = intParam.name.toLowerCase();

    if (['n', 'm', 'length', 'size', 'len'].includes(paramNameLower)) {
      inputObj[intParam.name] = Array.isArray(arrVal) ? arrVal.length : 0;
    } else if (['k', 'index', 'idx', 'pos'].includes(paramNameLower)) {
      if (Array.isArray(arrVal) && arrVal.length > 0) {
        if (category === 'boundary' || category === 'min_edge') {
          inputObj[intParam.name] = 0;
        } else if (category === 'stress' || category === 'max_edge') {
          inputObj[intParam.name] = arrVal.length - 1;
        } else if (category === 'pathological' || category === 'adversarial') {
          inputObj[intParam.name] = arrVal.length + 5; // Out-of-bounds adversarial
        } else {
          inputObj[intParam.name] = Math.floor(rng() * arrVal.length);
        }
      } else {
        inputObj[intParam.name] = 0;
      }
    } else if (['target', 'val', 'key', 'x', 'sum'].includes(paramNameLower)) {
      if (Array.isArray(arrVal) && arrVal.length >= 2) {
        if (category === 'pathological' || category === 'adversarial') {
          // Unreachable target
          inputObj[intParam.name] = 9999999;
        } else if (category === 'corner' || category === 'normal' || category === 'randomized') {
          // 70% chance of constructing a valid sum or choosing existing element
          if (rng() > 0.3) {
            const idx1 = Math.floor(rng() * arrVal.length);
            let idx2 = Math.floor(rng() * arrVal.length);
            if (idx1 !== idx2 && typeof arrVal[idx1] === 'number' && typeof arrVal[idx2] === 'number') {
              inputObj[intParam.name] = arrVal[idx1] + arrVal[idx2];
            } else if (typeof arrVal[idx1] === 'number') {
              inputObj[intParam.name] = arrVal[idx1];
            }
          }
        }
      } else if (Array.isArray(arrVal) && arrVal.length === 1 && typeof arrVal[0] === 'number') {
        inputObj[intParam.name] = arrVal[0];
      }
    }
  }

  // Correlate String + k / length / count
  if (stringParam && intParam) {
    const sVal = inputObj[stringParam.name];
    const paramNameLower = intParam.name.toLowerCase();
    if (['k', 'count', 'len', 'n'].includes(paramNameLower) && typeof sVal === 'string') {
      if (category === 'boundary' || category === 'min_edge') {
        inputObj[intParam.name] = 0;
      } else if (category === 'corner') {
        inputObj[intParam.name] = sVal.length;
      } else if (category === 'pathological' || category === 'adversarial') {
        inputObj[intParam.name] = sVal.length + 10;
      } else {
        inputObj[intParam.name] = Math.floor(rng() * (sVal.length + 1));
      }
    }
  }
}

module.exports = {
  correlateParameters,
};
