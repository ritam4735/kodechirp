// gateway/src/services/testGenerationService.js
// ─────────────────────────────────────────────────────────────────────────────
// Automated Test Generation Service
// Generates test inputs deterministically (or via AI if configured),
// runs reference solution to compute expected outputs, categorizes tests,
// performs quality checks, and stores results.
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../config/database');
const referenceSolutionService = require('./referenceSolutionService');
const logger = require('../utils/logger');

// ── AI Configuration ────────────────────────────────────────────────────────

const AI_CONFIG = {
  apiUrl: process.env.AI_API_URL || '',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'gpt-4o-mini',
};

function isAIConfigured() {
  return !!(AI_CONFIG.apiUrl && AI_CONFIG.apiKey);
}

// ── AI Request Helper ───────────────────────────────────────────────────────

async function callAI(systemPrompt, userPrompt) {
  if (!isAIConfigured()) {
    throw new Error('AI service is not configured. Set AI_API_URL and AI_API_KEY.');
  }

  const fetch = require('node-fetch');

  const response = await fetch(AI_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returned empty response');

  return JSON.parse(content);
}

// ── Test Input Generation Prompt ────────────────────────────────────────────

const TEST_GENERATION_PROMPT = `You are a competitive programming test case generator. Your task is to generate diverse, high-quality test inputs for a programming problem.

Generate test inputs in JSON format. Each test case must:
1. Be a valid input matching the problem's input format
2. Respect all constraints
3. Be a raw string that can be passed directly as stdin

You must return a JSON object with this structure:
{
  "test_cases": [
    {
      "input": "the raw stdin input as a string",
      "category": "one of: min_edge, max_edge, random_small, random_medium, random_large, duplicate_heavy, adversarial, corner_case",
      "visibility": "visible or hidden",
      "description": "brief description of what this tests"
    }
  ]
}

Generate exactly the number of test cases requested. Ensure good coverage:
- min_edge: minimum constraint values (empty arrays, single elements, zero, etc.)
- max_edge: maximum constraint values (largest arrays, extreme numbers)
- random_small: small random inputs
- random_medium: medium-sized random inputs
- random_large: larger random inputs (but still within constraints)
- duplicate_heavy: inputs with many duplicates
- adversarial: worst-case inputs designed to break naive solutions
- corner_case: tricky edge cases commonly missed

CRITICAL: Each "input" field must be the exact raw text that would be fed to stdin. Use newlines within the string where needed. Do NOT use arrays or objects for input values.`;

// ── Deterministic Generator Helpers ─────────────────────────────────────────

function stringToSeed(str) {
  let hash = 0;
  if (!str) return 42;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 42;
}

function createPRNG(seed) {
  let s = Math.abs(seed) || 12345;
  return function random() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function parseConstraintsBounds(constraintsJson, constraintsStr) {
  const bounds = {
    minVal: -100,
    maxVal: 100,
    minLen: 1,
    maxLen: 100,
    allowedValues: null,
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

  const parseNum = (s) => {
    if (!s) return NaN;
    const str = s.trim().replace(/,/g, '');
    if (str.includes('2^31-1') || str.includes('2^{31}-1')) return 2147483647;
    if (str.includes('-2^31') || str.includes('-2^{31}')) return -2147483648;
    if (str.includes('2^31') || str.includes('2^{31}')) return 2147483648;
    if (str.includes('^')) {
      const isNeg = str.startsWith('-');
      const cleanStr = isNeg ? str.slice(1) : str;
      const parts = cleanStr.split('^');
      const b = Number(parts[0]);
      const e = Number(parts[1]);
      const val = Math.pow(b, e);
      return isNeg ? -val : val;
    }
    return parseInt(str, 10);
  };

  // 1. Detect discrete value sets:
  // e.g. x ∈ {0,1}, x in {0,1}, x belongs to {0,1}, x is either 0 or 1, values are 0 or 1, binary matrix, boolean matrix
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

  // 2. Match Ranges: low <= var <= high
  const rangeRegex = /(-?\d+(?:\^\d+)?)\s*(?:<=|<)\s*([a-zA-Z0-9_\[\]\.]+)\s*(?:<=|<)\s*(-?\d+(?:\^\d+)?)/gi;
  let match;
  while ((match = rangeRegex.exec(text)) !== null) {
    const low = parseNum(match[1]);
    const varName = match[2].toLowerCase();
    const high = parseNum(match[3]);

    if (!isNaN(low) && !isNaN(high)) {
      if (
        varName.includes('length') ||
        varName.includes('len') ||
        varName.includes('size') ||
        varName === 'n' ||
        varName === 'm' ||
        varName === 'rows' ||
        varName === 'cols' ||
        varName === 'r' ||
        varName === 'c'
      ) {
        if (low >= 0) bounds.minLen = low;
        if (high > 0) bounds.maxLen = high;
      } else {
        if (!bounds.allowedValues) {
          bounds.minVal = low;
          bounds.maxVal = high;
        }
      }
    }
  }

  // 3. Fallback for single upper bound lengths: e.g. N <= 10 or length <= 100
  const singleLenRegex = /(?:length|len|nodes|n|m|size|s)\s*(?:<=|<)\s*(\d+(?:\^\d+)?)/gi;
  while ((match = singleLenRegex.exec(text)) !== null) {
    const maxL = parseNum(match[1]);
    if (!isNaN(maxL) && maxL > 0) bounds.maxLen = maxL;
  }

  return bounds;
}

function generateParamValue(type, category, idx, rng, bounds) {
  const normType = type ? type.trim() : 'Integer';
  const minV = bounds.minVal ?? -100;
  const maxV = bounds.maxVal ?? 100;
  const maxL = Math.min(bounds.maxLen ?? 100, 300);

  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const randChoice = (arr) => arr[Math.floor(rng() * arr.length)];

  if (normType === 'Integer' || normType === 'Int') {
    if (category === 'min_edge') return [0, 1, -1, Math.max(minV, -1000), 2][idx % 5];
    if (category === 'max_edge') return [Math.min(maxV, 1000), Math.min(maxV, 1000) - 1, Math.floor(maxV / 2)][idx % 3];
    if (category === 'corner_case') return [0, 1, -1, 2, 1024, -1024, 42][idx % 7];
    if (category === 'duplicate_heavy') return [5, 5, 0, 0, 1][idx % 5];
    if (category === 'adversarial') return [Math.min(maxV, 10000), Math.max(minV, -10000), 0][idx % 3];
    if (category === 'random_small') return randInt(-10, 10);
    if (category === 'random_medium') return randInt(-100, 100);
    if (category === 'random_large') return randInt(Math.max(minV, -1000), Math.min(maxV, 1000));
    return randInt(-50, 50);
  }

  if (normType === 'Float') {
    if (category === 'min_edge') return [0.0, 1.0, -1.0, 0.001][idx % 4];
    if (category === 'max_edge') return parseFloat((Math.min(maxV, 1000) * 1.0).toFixed(2));
    if (category === 'corner_case') return [0.0, 3.14159, -1.0, 2.718][idx % 4];
    if (category === 'random_small') return parseFloat((rng() * 20 - 10).toFixed(2));
    if (category === 'random_medium') return parseFloat((rng() * 200 - 100).toFixed(2));
    return parseFloat((rng() * 200 - 100).toFixed(2));
  }

  if (normType === 'Boolean') {
    if (category === 'min_edge') return false;
    if (category === 'max_edge') return true;
    return idx % 2 === 0;
  }

  if (normType === 'Character' || normType === 'Char') {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()[]{} ';
    if (category === 'min_edge') return 'a';
    if (category === 'corner_case') return ['(', ')', ' ', '0', 'z'][idx % 5];
    return chars[randInt(0, chars.length - 1)];
  }

  if (normType === 'String') {
    if (category === 'min_edge') return idx === 0 ? '' : 'a';
    if (category === 'corner_case') {
      const presets = ['', 'a', '()', '()[]{}', '(]', '((()))', 'a b c', '12345', '!!!', '([)]'];
      return presets[idx % presets.length];
    }
    if (category === 'duplicate_heavy') {
      const char = randChoice(['a', 'x', '(', '0']);
      return char.repeat(randInt(10, 40));
    }
    if (category === 'adversarial') {
      return '('.repeat(20) + ')'.repeat(19);
    }
    let len = 5;
    if (category === 'random_small') len = randInt(1, 10);
    else if (category === 'random_medium') len = randInt(10, 50);
    else if (category === 'random_large' || category === 'max_edge') len = randInt(50, Math.min(maxL, 200));

    const charset = 'abcdefghijklmnopqrstuvwxyz0123456789()[]{}';
    let res = '';
    for (let i = 0; i < len; i++) res += charset[randInt(0, charset.length - 1)];
    return res;
  }

  if (normType === 'Array<Integer>' || normType === 'Array<Int>') {
    if (category === 'min_edge') {
      return [[], [0], [1], [-1], [1, 2]][idx % 5];
    }
    if (category === 'corner_case') {
      const presets = [
        [1, 2, 3, 4, 5],
        [5, 4, 3, 2, 1],
        [0, 0, 0, 0],
        [1, -1, 2, -2],
        [42],
        [100, -100],
        [1, 2, 2, 1],
        [3, 3],
      ];
      return presets[idx % presets.length];
    }
    if (category === 'duplicate_heavy') {
      const len = randInt(10, 30);
      const val = randInt(-10, 10);
      return Array.from({ length: len }, () => val);
    }
    if (category === 'adversarial') {
      const len = randInt(20, 50);
      return Array.from({ length: len }, (_, i) => (i % 2 === 0 ? 100 : -100));
    }
    let len = 10;
    if (category === 'random_small') len = randInt(2, 10);
    else if (category === 'random_medium') len = randInt(10, 40);
    else if (category === 'random_large') len = randInt(40, Math.min(maxL, 150));
    else if (category === 'max_edge') len = Math.min(maxL, 200);

    return Array.from({ length: len }, () => randInt(-50, 50));
  }

  if (normType === 'Array<Float>') {
    if (category === 'min_edge') return [];
    const len = randInt(2, 15);
    return Array.from({ length: len }, () => parseFloat((rng() * 20 - 10).toFixed(2)));
  }

  if (normType === 'Array<String>') {
    if (category === 'min_edge') return [];
    if (category === 'corner_case') return [['a'], ['', ''], ['hello', 'world']][idx % 3];
    const len = randInt(2, 12);
    return Array.from({ length: len }, () => 'str' + randInt(1, 100));
  }

  if (normType === 'Array<Boolean>') {
    if (category === 'min_edge') return [];
    const len = randInt(2, 12);
    return Array.from({ length: len }, () => rng() > 0.5);
  }

  if (normType === 'Matrix<Integer>' || normType === 'Matrix<Int>') {
    const genElem = () => {
      if (bounds?.allowedValues && bounds.allowedValues.length > 0) {
        return randChoice(bounds.allowedValues);
      }
      return randInt(bounds?.minVal ?? -10, bounds?.maxVal ?? 10);
    };
    const minDim = Math.max(1, bounds?.minLen ?? 1);
    const maxDim = Math.min(Math.max(minDim, bounds?.maxLen ?? 6), 6);

    if (category === 'min_edge') {
      return Array.from({ length: minDim }, () => Array.from({ length: minDim }, genElem));
    }
    if (category === 'corner_case') {
      const d = Math.max(minDim, 2);
      return Array.from({ length: d }, () => Array.from({ length: d }, genElem));
    }
    const rows = randInt(minDim, maxDim);
    const cols = randInt(minDim, maxDim);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, genElem)
    );
  }

  if (normType === 'Matrix<Float>') {
    const minDim = Math.max(1, bounds?.minLen ?? 1);
    const maxDim = Math.min(Math.max(minDim, bounds?.maxLen ?? 5), 5);
    const rows = category === 'min_edge' ? minDim : randInt(minDim, maxDim);
    const cols = category === 'min_edge' ? minDim : randInt(minDim, maxDim);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => parseFloat((rng() * 10).toFixed(2)))
    );
  }

  if (normType === 'Matrix<String>') {
    const minDim = Math.max(1, bounds?.minLen ?? 1);
    const maxDim = Math.min(Math.max(minDim, bounds?.maxLen ?? 5), 5);
    const rows = category === 'min_edge' ? minDim : randInt(minDim, maxDim);
    const cols = category === 'min_edge' ? minDim : randInt(minDim, maxDim);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 'c' + randInt(1, 9))
    );
  }

  if (normType === 'Matrix<Boolean>') {
    const minDim = Math.max(1, bounds?.minLen ?? 1);
    const maxDim = Math.min(Math.max(minDim, bounds?.maxLen ?? 5), 5);
    const rows = category === 'min_edge' ? minDim : randInt(minDim, maxDim);
    const cols = category === 'min_edge' ? minDim : randInt(minDim, maxDim);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => rng() > 0.5)
    );
  }

  if (normType === 'LinkedList') {
    if (category === 'min_edge') return idx === 0 ? [] : [0];
    if (category === 'corner_case') return [[1, 2, 3, 4, 5], [1], [1, 2], [5, 4, 3, 2, 1]][idx % 4];
    const len = randInt(1, 20);
    return Array.from({ length: len }, () => randInt(-50, 50));
  }

  if (normType === 'BinaryTree') {
    if (category === 'min_edge') return [];
    if (category === 'corner_case') return [[1], [1, 2, 3], [1, null, 2, null, 3]][idx % 3];
    const len = randInt(3, 15);
    const tree = [randInt(1, 50)];
    for (let i = 1; i < len; i++) {
      tree.push(rng() < 0.2 ? null : randInt(-50, 50));
    }
    return tree;
  }

  return randInt(0, 100);
}

// ── Generic Parameter Correlation ──────────────────────────────────────────

function correlateFunctionParameters(inputObj, params, category, rng, bounds) {
  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const randChoice = (arr) => arr[Math.floor(rng() * arr.length)];

  const matrixParam = params.find(p => p.type.startsWith('Matrix'));
  const arrayParam = params.find(p => (p.type.startsWith('Array') || p.type === 'LinkedList') && !p.type.startsWith('Matrix'));
  const intParams = params.filter(p => p.type === 'Integer' || p.type === 'Int' || p.type === 'Long');
  const stringParam = params.find(p => p.type === 'String');

  // A. Correlate Matrix<T> + Integer(s)
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
      // Single dimension param -> Square matrix N x N (e.g. maze,n / grid,n / matrix,n)
      const nParam = matchingIntParams[0];
      let n;
      if (category === 'min_edge') n = minDim;
      else if (category === 'max_edge') n = maxDim;
      else if (category === 'random_small' || category === 'corner_case') n = randInt(minDim, Math.min(maxDim, minDim + 2));
      else n = randInt(minDim, maxDim);

      inputObj[nParam.name] = n;
      inputObj[matrixParam.name] = Array.from({ length: n }, () =>
        Array.from({ length: n }, genMatrixElem)
      );
    } else if (matchingIntParams.length >= 2) {
      // Dual dimension params -> Rectangular matrix M x N (e.g. image,rows,cols / board,m,n)
      const rowKeywords = ['rows', 'row', 'r', 'height', 'h', 'm'];
      const colKeywords = ['cols', 'col', 'c', 'width', 'w', 'n'];

      let rowParam = matchingIntParams.find(p => rowKeywords.includes(p.name.toLowerCase()));
      let colParam = matchingIntParams.find(p => colKeywords.includes(p.name.toLowerCase()) && p !== rowParam);

      if (!rowParam || !colParam) {
        rowParam = matchingIntParams[0];
        colParam = matchingIntParams[1];
      }

      let rCount, cCount;
      if (category === 'min_edge') {
        rCount = minDim;
        cCount = minDim;
      } else if (category === 'max_edge') {
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
    } else {
      // Matrix exists without explicit dimension param: ensure matrix is valid rectangular
      const mat = inputObj[matrixParam.name];
      if (Array.isArray(mat) && mat.length > 0) {
        const colLen = Array.isArray(mat[0]) ? Math.max(1, mat[0].length) : minDim;
        inputObj[matrixParam.name] = mat.map(row =>
          Array.isArray(row) && row.length === colLen ? row : Array.from({ length: colLen }, genMatrixElem)
        );
      }
    }
  }

  // B. Correlate Array<T> + Integer(s)
  if (arrayParam && intParams.length > 0) {
    const arrVal = inputObj[arrayParam.name];
    for (const intP of intParams) {
      const pNameLower = intP.name.toLowerCase();
      if (['n', 'm', 'length', 'size', 'len'].includes(pNameLower)) {
        inputObj[intP.name] = Array.isArray(arrVal) ? arrVal.length : 0;
      } else if (['k', 'index', 'idx', 'pos'].includes(pNameLower)) {
        if (Array.isArray(arrVal) && arrVal.length > 0) {
          inputObj[intP.name] = randInt(0, arrVal.length - 1);
        } else {
          inputObj[intP.name] = 0;
        }
      } else if (['target', 'val', 'key', 'x'].includes(pNameLower)) {
        if (Array.isArray(arrVal) && arrVal.length >= 2) {
          if (category === 'adversarial') {
            inputObj[intP.name] = 999999;
          } else if (rng() > 0.3) {
            const idx1 = randInt(0, arrVal.length - 1);
            const idx2 = randInt(0, arrVal.length - 1);
            if (idx1 !== idx2 && typeof arrVal[idx1] === 'number' && typeof arrVal[idx2] === 'number') {
              inputObj[intP.name] = arrVal[idx1] + arrVal[idx2];
            } else if (typeof arrVal[idx1] === 'number') {
              inputObj[intP.name] = arrVal[idx1];
            }
          }
        }
      }
    }
  }

  // C. Correlate String + Integer
  if (stringParam && intParams.length > 0) {
    const sVal = inputObj[stringParam.name];
    for (const intP of intParams) {
      const pNameLower = intP.name.toLowerCase();
      if (['k', 'count', 'len', 'n'].includes(pNameLower) && typeof sVal === 'string') {
        inputObj[intP.name] = randInt(0, sVal.length);
      }
    }
  }
}

// ── Pre-Execution Candidate Validator ──────────────────────────────────────

function validateCandidateInput(candidate, problem, bounds) {
  if (problem.judge_mode === 'STDIN_STDOUT') {
    const raw = typeof candidate === 'string' ? candidate : candidate.input;
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      return { valid: false, reason: 'Empty STDIN candidate' };
    }
    return { valid: true };
  }

  // FUNCTION mode
  const inputObj = candidate.input_json !== undefined ? candidate.input_json : candidate;
  if (!inputObj || typeof inputObj !== 'object' || Array.isArray(inputObj)) {
    return { valid: false, reason: 'input_json must be a non-null object' };
  }

  const sig = typeof problem.signature_metadata === 'string'
    ? JSON.parse(problem.signature_metadata || '{}')
    : (problem.signature_metadata || {});
  const params = Array.isArray(sig.params) ? sig.params : [];

  for (const p of params) {
    if (!(p.name in inputObj)) {
      return { valid: false, reason: `Missing parameter '${p.name}' in input_json` };
    }
    const val = inputObj[p.name];
    const pType = p.type ? p.type.trim() : 'Integer';

    if (pType.startsWith('Matrix<')) {
      if (!Array.isArray(val) || val.length === 0) {
        return { valid: false, reason: `Matrix parameter '${p.name}' must be a non-empty array of arrays` };
      }
      const numCols = val[0]?.length;
      if (!Array.isArray(val[0]) || typeof numCols !== 'number' || numCols === 0) {
        return { valid: false, reason: `Matrix '${p.name}' row 0 is not a non-empty array` };
      }
      for (let r = 0; r < val.length; r++) {
        if (!Array.isArray(val[r]) || val[r].length !== numCols) {
          return { valid: false, reason: `Matrix '${p.name}' is jagged (row ${r} length ${val[r]?.length} != ${numCols})` };
        }
      }
      if (bounds?.allowedValues && bounds.allowedValues.length > 0) {
        const allowedSet = new Set(bounds.allowedValues);
        for (let r = 0; r < val.length; r++) {
          for (let c = 0; c < numCols; c++) {
            if (!allowedSet.has(val[r][c])) {
              return { valid: false, reason: `Matrix cell [${r}][${c}] value ${val[r][c]} not in allowed set: [${bounds.allowedValues}]` };
            }
          }
        }
      }
    } else if (pType.startsWith('Array<') || pType === 'LinkedList') {
      if (!Array.isArray(val)) {
        return { valid: false, reason: `Array parameter '${p.name}' must be an array, got ${typeof val}` };
      }
    } else if (pType === 'Integer' || pType === 'Int' || pType === 'Long') {
      if (typeof val !== 'number' || !Number.isInteger(val)) {
        return { valid: false, reason: `Integer parameter '${p.name}' must be an integer, got ${val}` };
      }
    } else if (pType === 'Boolean') {
      if (typeof val !== 'boolean') {
        return { valid: false, reason: `Boolean parameter '${p.name}' must be boolean, got ${typeof val}` };
      }
    } else if (pType === 'String') {
      if (typeof val !== 'string') {
        return { valid: false, reason: `String parameter '${p.name}' must be string, got ${typeof val}` };
      }
    }
  }

  // Cross-parameter correlation checks for Matrix
  const matrixParam = params.find(p => p.type.startsWith('Matrix'));
  if (matrixParam) {
    const mat = inputObj[matrixParam.name];
    const intParams = params.filter(p => p.type === 'Integer' || p.type === 'Int' || p.type === 'Long');
    const dimKeywords = ['n', 'm', 'rows', 'row', 'r', 'cols', 'col', 'c', 'size', 'len', 'length', 'height', 'h', 'width', 'w', 'dim', 'dimension'];
    const matchingIntParams = intParams.filter(p => dimKeywords.includes(p.name.toLowerCase()));

    if (matchingIntParams.length === 1) {
      const nVal = inputObj[matchingIntParams[0].name];
      if (mat.length !== nVal || mat[0].length !== nVal) {
        return {
          valid: false,
          reason: `Matrix dimension mismatch: expected ${nVal}x${nVal} for '${matchingIntParams[0].name}', got ${mat.length}x${mat[0].length}`,
        };
      }
    } else if (matchingIntParams.length >= 2) {
      const rowKeywords = ['rows', 'row', 'r', 'height', 'h', 'm'];
      const colKeywords = ['cols', 'col', 'c', 'width', 'w', 'n'];
      const rowP = matchingIntParams.find(p => rowKeywords.includes(p.name.toLowerCase())) || matchingIntParams[0];
      const colP = matchingIntParams.find(p => colKeywords.includes(p.name.toLowerCase()) && p !== rowP) || matchingIntParams[1];
      const rVal = inputObj[rowP.name];
      const cVal = inputObj[colP.name];
      if (mat.length !== rVal || mat[0].length !== cVal) {
        return {
          valid: false,
          reason: `Matrix dimension mismatch: expected ${rVal}x${cVal}, got ${mat.length}x${mat[0].length}`,
        };
      }
    }
  }

  return { valid: true };
}

function generateDeterministicInputs(problem, existingExamples = [], parsedBounds = null) {
  const seed = stringToSeed(problem.id || problem.title || 'kodechirp');
  const rng = createPRNG(seed);
  const bounds = parsedBounds || parseConstraintsBounds(problem.constraints_json, problem.constraints);
  const candidateTests = [];

  const categoriesPlan = [
    { category: 'min_edge', count: 6, visibility: 'visible' },
    { category: 'corner_case', count: 10, visibility: 'visible' },
    { category: 'random_small', count: 12, visibility: 'visible' },
    { category: 'duplicate_heavy', count: 6, visibility: 'hidden' },
    { category: 'adversarial', count: 6, visibility: 'hidden' },
    { category: 'random_medium', count: 15, visibility: 'hidden' },
    { category: 'random_large', count: 15, visibility: 'hidden' },
    { category: 'max_edge', count: 6, visibility: 'hidden' },
  ];

  const parsedExamples = [];
  if (Array.isArray(problem.examples_json)) {
    for (const ex of problem.examples_json) {
      if (ex && ex.input) parsedExamples.push(ex.input);
    }
  }
  for (const row of existingExamples) {
    if (row.input_json) parsedExamples.push(row.input_json);
    else if (row.input) parsedExamples.push(row.input);
  }

  if (problem.judge_mode === 'FUNCTION') {
    const signature = typeof problem.signature_metadata === 'string'
      ? JSON.parse(problem.signature_metadata || '{}')
      : (problem.signature_metadata || {});

    const params = signature.params || [{ name: 'input', type: 'Integer' }];

    for (const exInput of parsedExamples) {
      let parsed = null;
      if (typeof exInput === 'object' && exInput !== null) {
        parsed = exInput;
      } else if (typeof exInput === 'string') {
        try {
          parsed = JSON.parse(exInput);
        } catch (e) {}
      }
      if (parsed) {
        const candidate = {
          input_json: parsed,
          category: 'corner_case',
          visibility: 'visible',
          description: 'Example case from problem specification',
        };
        const validation = validateCandidateInput(candidate, problem, bounds);
        if (validation.valid) {
          candidateTests.push(candidate);
        }
      }
    }

    for (const plan of categoriesPlan) {
      let generatedForPlan = 0;
      let attempts = 0;
      const maxAttempts = plan.count * 6;

      while (generatedForPlan < plan.count && attempts < maxAttempts) {
        attempts++;
        const inputObj = {};

        for (const param of params) {
          inputObj[param.name] = generateParamValue(param.type, plan.category, attempts, rng, bounds);
        }

        correlateFunctionParameters(inputObj, params, plan.category, rng, bounds);

        const candidate = {
          input_json: inputObj,
          category: plan.category,
          visibility: plan.visibility,
          description: `Deterministic ${plan.category} test case #${generatedForPlan + 1}`,
        };

        const validation = validateCandidateInput(candidate, problem, bounds);
        if (validation.valid) {
          candidateTests.push(candidate);
          generatedForPlan++;
        }
      }
    }
  } else {
    // STDIN_STDOUT mode
    for (const exInput of parsedExamples) {
      if (typeof exInput === 'string' && exInput.trim()) {
        candidateTests.push({
          input: exInput.trim(),
          category: 'corner_case',
          visibility: 'visible',
          description: 'Example case from problem specification',
        });
      }
    }

    let lineStructure = null;
    if (parsedExamples.length > 0 && typeof parsedExamples[0] === 'string') {
      const lines = parsedExamples[0].trim().split('\n');
      lineStructure = lines.map(l => {
        const tokens = l.trim().split(/\s+/).filter(Boolean);
        return { count: tokens.length, isNum: tokens.every(t => !isNaN(Number(t))) };
      });
    }

    for (const plan of categoriesPlan) {
      for (let i = 0; i < plan.count; i++) {
        let inputStr = '';

        if (lineStructure && lineStructure.length > 0) {
          const lines = [];
          for (let lIdx = 0; lIdx < lineStructure.length; lIdx++) {
            const spec = lineStructure[lIdx];
            if (lIdx === 0 && lineStructure.length > 1 && spec.count === 1 && spec.isNum) {
              let nVal = 5;
              if (plan.category === 'min_edge') nVal = 1;
              else if (plan.category === 'random_small') nVal = Math.floor(rng() * 8) + 2;
              else if (plan.category === 'random_medium') nVal = Math.floor(rng() * 30) + 10;
              else if (plan.category === 'random_large' || plan.category === 'max_edge') nVal = Math.floor(rng() * 100) + 50;
              lines.push(String(nVal));

              if (lineStructure[1]) {
                const arr = [];
                for (let k = 0; k < nVal; k++) {
                  let v = Math.floor(rng() * 100) - 50;
                  if (plan.category === 'duplicate_heavy') v = 5;
                  if (plan.category === 'min_edge') v = 0;
                  arr.push(v);
                }
                lines.push(arr.join(' '));
                lIdx++;
              }
            } else {
              const tokens = [];
              for (let t = 0; t < spec.count; t++) {
                if (spec.isNum) tokens.push(Math.floor(rng() * 100) - 50);
                else tokens.push('val' + t);
              }
              lines.push(tokens.join(' '));
            }
          }
          inputStr = lines.join('\n');
        } else {
          if (plan.category === 'min_edge') inputStr = '0';
          else if (plan.category === 'corner_case') inputStr = ['1', '0', '-1', '10 20 30'][i % 4];
          else {
            const n = Math.floor(rng() * 20) + 1;
            const arr = Array.from({ length: n }, () => Math.floor(rng() * 100) - 50);
            inputStr = `${n}\n${arr.join(' ')}`;
          }
        }

        candidateTests.push({
          input: inputStr,
          category: plan.category,
          visibility: plan.visibility,
          description: `Deterministic ${plan.category} test case #${i + 1}`,
        });
      }
    }
  }

  return candidateTests;
}

// ── Main Generation Pipeline ────────────────────────────────────────────────

/**
 * Generate test cases for a problem using reference solution + deterministic / AI generators.
 *
 * @param {string} problemId
 * @param {Object} options
 * @param {number} options.visibleCount - Number of visible tests (default: 10)
 * @param {number} options.hiddenCount - Number of hidden tests (default: 50)
 * @param {boolean} options.dryRun - If true, don't save to DB
 * @returns {Object} Generation result with tests and coverage report
 */
async function generateTests(problemId, options = {}) {
  const {
    visibleCount = 10,
    hiddenCount = 50,
    dryRun = false,
  } = options;

  const totalCount = visibleCount + hiddenCount;

  // ── Step 1: Gather problem context ──────────────────────────────────────

  const problemResult = await db.query(
    `SELECT id, title, description, description_md, constraints, constraints_json,
            examples_json, input_format, output_format, reference_solution_id,
            judge_mode, signature_metadata
     FROM problems WHERE id = $1`,
    [problemId]
  );

  if (problemResult.rowCount === 0) {
    throw new Error('Problem not found');
  }

  const problem = problemResult.rows[0];

  if (!problem.reference_solution_id) {
    throw new Error('Problem has no reference solution. Add and verify one before generating tests.');
  }

  // Verify reference solution is in good standing
  const refSolution = await referenceSolutionService.get(problem.reference_solution_id);
  if (!refSolution) {
    throw new Error('Reference solution not found');
  }

  if (refSolution.compile_status !== 'verified') {
    throw new Error(`Reference solution is not verified (status: ${refSolution.compile_status}). Verify it first.`);
  }

  // Get existing examples for context
  const existingExamples = await db.query(
    'SELECT input, expected_output, input_json, expected_json FROM test_cases WHERE problem_id = $1 AND is_sample = TRUE ORDER BY order_index LIMIT 5',
    [problemId]
  );

  // ── Step 2: Generate candidate inputs ───────────────────────────────────

  let candidateTests = [];
  let aiAttempted = false;

  if (isAIConfigured()) {
    aiAttempted = true;
    try {
      const description = problem.description_md || problem.description || '';
      const constraints = problem.constraints_json
        ? JSON.stringify(problem.constraints_json)
        : (problem.constraints || 'No constraints specified');

      const userPrompt = `Problem: ${problem.title}

Description:
${description}

${problem.judge_mode === 'STDIN_STDOUT' ? `Input Format:
${problem.input_format || 'See description'}

Output Format:
${problem.output_format || 'See description'}` : `Signature:
${typeof problem.signature_metadata === 'object' ? JSON.stringify(problem.signature_metadata, null, 2) : problem.signature_metadata}
Note: Generate an 'input_json' field instead of 'input', structured as a JSON object with keys matching the parameter names.`}

Constraints:
${constraints}

${existingExamples.rowCount > 0 ? `Examples (for format reference):
${existingExamples.rows.map((e, i) => `Example ${i + 1}:\nInput:\n${e.input || JSON.stringify(e.input_json)}\nOutput:\n${e.expected_output || JSON.stringify(e.expected_json)}`).join('\n\n')}` : ''}

Generate ${totalCount} test cases with this distribution:
- ${visibleCount} visible (for users to see): mix of simple edge cases and small inputs
- ${hiddenCount} hidden (for judging): distributed as follows:
  * 5 minimum edge cases
  * 5 maximum edge cases
  * 10 random small
  * 10 random medium
  * 10 random large
  * 5 duplicate-heavy
  * 5 adversarial`;

      const aiResult = await callAI(TEST_GENERATION_PROMPT, userPrompt);
      if (Array.isArray(aiResult.test_cases) && aiResult.test_cases.length > 0) {
        candidateTests = aiResult.test_cases;
        logger.info({ problemId, generated: candidateTests.length }, '[TestGen] AI generated candidate inputs');
      }
    } catch (err) {
      logger.warn({ problemId, err: err.message }, '[TestGen] AI generation failed, falling back to deterministic generator');
    }
  }

  // Parse constraints bounds once for candidate generation and validation
  const bounds = parseConstraintsBounds(problem.constraints_json, problem.constraints);

  // Generate deterministic candidates (either as primary generator or to supplement/fallback)
  const deterministicCandidates = generateDeterministicInputs(problem, existingExamples.rows, bounds);
  logger.info({ problemId, generated: deterministicCandidates.length }, '[TestGen] Deterministic candidate inputs generated');

  if (candidateTests.length > 0) {
    // Merge AI candidates with deterministic candidates for maximum test suite quality
    candidateTests = [...candidateTests, ...deterministicCandidates];
  } else {
    candidateTests = deterministicCandidates;
  }

  // ── Step 3: Validate and deduplicate inputs ─────────────────────────────

  const seenInputs = new Set();
  const validTests = [];

  for (const tc of candidateTests) {
    // Validate candidate before dispatching
    const validation = validateCandidateInput(tc, problem, bounds);
    if (!validation.valid) {
      logger.warn({ reason: validation.reason }, '[TestGen] Dropping invalid candidate before execution');
      continue;
    }

    // Deduplicate based on whether it's STDIN or FUNCTION
    const rawInput = problem.judge_mode === 'STDIN_STDOUT'
      ? tc.input
      : JSON.stringify(tc.input_json || tc.input);
    if (!rawInput || typeof rawInput !== 'string') continue;

    const normalizedInput = rawInput.trim();
    if (!normalizedInput) continue;

    if (seenInputs.has(normalizedInput)) continue;
    seenInputs.add(normalizedInput);

    validTests.push({
      input: normalizedInput, // Dual storage non-null string
      input_json: problem.judge_mode !== 'STDIN_STDOUT' ? (tc.input_json || JSON.parse(normalizedInput)) : null,
      category: tc.category || 'random_small',
      visibility: tc.visibility || 'hidden',
      description: tc.description || '',
    });
  }

  logger.info({ problemId, valid: validTests.length, dropped: candidateTests.length - validTests.length },
    '[TestGen] Input validation complete');

  // ── Step 4: Run reference solution to generate expected outputs ─────────

  const processedTests = [];
  const failures = [];

  for (const tc of validTests) {
    const inputToRun = problem.judge_mode === 'STDIN_STDOUT' ? tc.input : JSON.stringify(tc.input_json);
    try {
      const result = await referenceSolutionService.runAgainstInput(
        problem.reference_solution_id,
        inputToRun
      );

      if (result.timedOut) {
        failures.push({ input: inputToRun.substring(0, 100), error: 'Timed out' });
        continue;
      }

      if (result.exitCode !== 0 && !result.stdout) {
        failures.push({ input: inputToRun.substring(0, 100), error: result.stderr || 'Non-zero exit' });
        continue;
      }

      const rawStdout = (result.stdout || '').trim();
      let parsedJson = null;

      if (problem.judge_mode !== 'STDIN_STDOUT') {
        if (rawStdout) {
          try {
            parsedJson = JSON.parse(rawStdout);
          } catch (_) {
            const lines = rawStdout.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
              try {
                const candidate = JSON.parse(lines[i].trim());
                if (candidate && typeof candidate === 'object' && 'result' in candidate) {
                  parsedJson = candidate.result;
                } else {
                  parsedJson = candidate;
                }
                break;
              } catch (_) {}
            }
          }
        }
        if (parsedJson === null && rawStdout !== '') {
          parsedJson = rawStdout;
        }
      }

      const outputStr = problem.judge_mode === 'STDIN_STDOUT'
        ? rawStdout
        : (parsedJson !== null && parsedJson !== undefined ? JSON.stringify(parsedJson) : rawStdout);

      processedTests.push({
        ...tc,
        expectedOutput: outputStr, // Dual storage non-null string
        expectedJson: parsedJson,
        verified: true,
      });
    } catch (err) {
      failures.push({ input: inputToRun.substring(0, 100), error: err.message });
    }
  }

  logger.info({ problemId, processed: processedTests.length, failed: failures.length },
    '[TestGen] Reference solution execution complete');

  // ── Step 5: Quality checks ──────────────────────────────────────────────

  const qualityReport = runQualityChecks(processedTests);

  // ── Step 6: Categorize as visible/hidden ────────────────────────────────

  const visibleTests = processedTests
    .filter(t => t.visibility === 'visible')
    .slice(0, visibleCount);

  const hiddenTests = processedTests
    .filter(t => t.visibility === 'hidden')
    .slice(0, hiddenCount);

  if (visibleTests.length < visibleCount) {
    const remaining = processedTests
      .filter(t => !visibleTests.includes(t) && !hiddenTests.includes(t));
    while (visibleTests.length < visibleCount && remaining.length > 0) {
      const t = remaining.shift();
      t.visibility = 'visible';
      visibleTests.push(t);
    }
  }

  // ── Step 7: Persist to database ─────────────────────────────────────────

  if (!dryRun && (visibleTests.length > 0 || hiddenTests.length > 0)) {
    const allTests = [...visibleTests, ...hiddenTests];

    // Pre-DB insertion assertions to catch any serialization bug with explicit diagnostics
    for (let i = 0; i < allTests.length; i++) {
      const tc = allTests[i];
      if (tc.input === null || tc.input === undefined) {
        throw new Error(`[TestGen InternalError] test_case[${i}] 'input' is null/undefined (category: ${tc.category})`);
      }
      if (tc.expectedOutput === null || tc.expectedOutput === undefined) {
        throw new Error(`[TestGen InternalError] test_case[${i}] 'expected_output' is null/undefined (category: ${tc.category})`);
      }
      if (problem.judge_mode !== 'STDIN_STDOUT') {
        if (tc.input_json === null || tc.input_json === undefined) {
          throw new Error(`[TestGen InternalError] test_case[${i}] 'input_json' is null/undefined (category: ${tc.category})`);
        }
        if (tc.expectedJson === null || tc.expectedJson === undefined) {
          throw new Error(`[TestGen InternalError] test_case[${i}] 'expected_json' is null/undefined (category: ${tc.category})`);
        }
      }
    }

    const maxOrderRes = await db.query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 as next_idx FROM test_cases WHERE problem_id = $1',
      [problemId]
    );
    let orderIdx = maxOrderRes.rows[0].next_idx;

    const values = [];
    const placeholders = [];
    let paramIdx = 1;

    for (const tc of allTests) {
      placeholders.push(
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9})`
      );
      values.push(
        problemId,
        tc.input,
        tc.expectedOutput,
        tc.input_json != null ? JSON.stringify(tc.input_json) : null,
        tc.expectedJson != null ? JSON.stringify(tc.expectedJson) : null,
        tc.visibility === 'visible',
        orderIdx++,
        tc.category,
        'auto_generated',
        true
      );
      paramIdx += 10;
    }

    if (placeholders.length > 0) {
      await db.query(`
        INSERT INTO test_cases (problem_id, input, expected_output, input_json, expected_json, is_sample, order_index, category, generated_by, verified)
        VALUES ${placeholders.join(', ')}
      `, values);
    }

    logger.info({
      problemId,
      visible: visibleTests.length,
      hidden: hiddenTests.length,
    }, '[TestGen] Test cases saved to database');
  }

  // ── Return full report ────────────────────────────────────────────────

  return {
    problemId,
    summary: {
      totalGenerated: candidateTests.length,
      totalValid: validTests.length,
      totalProcessed: processedTests.length,
      visibleSaved: visibleTests.length,
      hiddenSaved: hiddenTests.length,
      failures: failures.length,
      dryRun,
      aiAttempted,
    },
    quality: qualityReport,
    failures: failures.slice(0, 10),
    visibleTests: visibleTests.map(t => ({
      input: (t.input || JSON.stringify(t.input_json)).substring(0, 500),
      output: (t.expectedOutput || JSON.stringify(t.expectedJson)).substring(0, 500),
      category: t.category,
    })),
    hiddenTests: hiddenTests.map(t => ({
      input: (t.input || JSON.stringify(t.input_json)).substring(0, 200),
      output: (t.expectedOutput || JSON.stringify(t.expectedJson)).substring(0, 200),
      category: t.category,
    })),
  };
}

// ── Quality Checks ──────────────────────────────────────────────────────────

function runQualityChecks(tests) {
  const report = {
    totalTests: tests.length,
    duplicateInputs: 0,
    allOutputsIdentical: false,
    categoryDistribution: {},
    coverageFlags: {
      hasMinEdge: false,
      hasMaxEdge: false,
      hasRandom: false,
      hasAdversarial: false,
      hasDuplicateHeavy: false,
    },
  };

  for (const tc of tests) {
    const cat = tc.category || 'unknown';
    report.categoryDistribution[cat] = (report.categoryDistribution[cat] || 0) + 1;

    if (cat === 'min_edge' || cat === 'corner_case') report.coverageFlags.hasMinEdge = true;
    if (cat === 'max_edge') report.coverageFlags.hasMaxEdge = true;
    if (cat.startsWith('random')) report.coverageFlags.hasRandom = true;
    if (cat === 'adversarial') report.coverageFlags.hasAdversarial = true;
    if (cat === 'duplicate_heavy') report.coverageFlags.hasDuplicateHeavy = true;
  }

  if (tests.length > 1) {
    const outputs = new Set(tests.map(t => t.expectedOutput || JSON.stringify(t.expectedJson)));
    report.allOutputsIdentical = outputs.size === 1;
    report.uniqueOutputs = outputs.size;
  }

  const inputs = tests.map(t => t.input || JSON.stringify(t.input_json));
  const uniqueInputs = new Set(inputs);
  report.duplicateInputs = inputs.length - uniqueInputs.size;

  return report;
}

module.exports = {
  generateTests,
  isAIConfigured,
  parseConstraintsBounds,
  correlateFunctionParameters,
  validateCandidateInput,
};

