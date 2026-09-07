// gateway/src/services/testGen/validator.js
'use strict';

const logger = require('../../utils/logger');

/**
 * Stage 1: Input Schema & Bounds Validation.
 * Validates that candidate input matches parameter schema and adheres to bounds.
 *
 * @param {Object} candidate - { input_json, input, category }
 * @param {Object} problem - problem record
 * @param {Object} bounds - parsed bounds
 * @returns {{ valid: boolean, error?: string }}
 */
function validateInput(candidate, problem, bounds) {
  const isFunctionMode = problem.judge_mode === 'FUNCTION';

  if (isFunctionMode) {
    if (!candidate.input_json || typeof candidate.input_json !== 'object') {
      return { valid: false, error: 'Input is not a valid JSON object in FUNCTION mode' };
    }

    const sig = typeof problem.signature_metadata === 'string'
      ? JSON.parse(problem.signature_metadata || '{}')
      : (problem.signature_metadata || {});
    const params = Array.isArray(sig.params) ? sig.params : [];

    for (const p of params) {
      if (!(p.name in candidate.input_json)) {
        return { valid: false, error: `Missing required parameter '${p.name}' in input` };
      }

      const val = candidate.input_json[p.name];
      const pType = (p.type || '').trim();

      // Check primitive types
      if (pType === 'Integer' || pType === 'Int' || pType === 'Long' || pType === 'Int64') {
        if (typeof val !== 'number' || !Number.isFinite(val)) {
          return { valid: false, error: `Parameter '${p.name}' must be a finite number, got ${typeof val}` };
        }
      } else if (pType === 'Float' || pType === 'Double') {
        if (typeof val !== 'number' || !Number.isFinite(val)) {
          return { valid: false, error: `Parameter '${p.name}' must be a finite float, got ${typeof val}` };
        }
      } else if (pType === 'Boolean') {
        if (typeof val !== 'boolean') {
          return { valid: false, error: `Parameter '${p.name}' must be a boolean, got ${typeof val}` };
        }
      } else if (pType === 'String') {
        if (typeof val !== 'string') {
          return { valid: false, error: `Parameter '${p.name}' must be a string, got ${typeof val}` };
        }
      } else if (pType.startsWith('Array<') || pType === 'LinkedList') {
        if (!Array.isArray(val)) {
          return { valid: false, error: `Parameter '${p.name}' must be an array, got ${typeof val}` };
        }
      } else if (pType.startsWith('Matrix<')) {
        if (!Array.isArray(val) || (val.length > 0 && !Array.isArray(val[0]))) {
          return { valid: false, error: `Parameter '${p.name}' must be a 2D matrix array, got ${typeof val}` };
        }
      } else if (pType === 'BinaryTree') {
        if (!Array.isArray(val)) {
          return { valid: false, error: `Parameter '${p.name}' BinaryTree must be represented as array, got ${typeof val}` };
        }
      }
    }

    return { valid: true };
  }

  // STDIN_STDOUT mode
  if (typeof candidate.input !== 'string') {
    return { valid: false, error: 'Input must be a string in STDIN_STDOUT mode' };
  }

  // Check for non-empty input
  if (candidate.input === null || candidate.input === undefined) {
    return { valid: false, error: 'Input cannot be null or undefined' };
  }

  return { valid: true };
}

/**
 * Stage 2: Reference Solution Execution Integrity.
 * Runs reference solution against candidate input and ensures it executes cleanly.
 *
 * @param {string} solutionId
 * @param {string} inputToRun
 * @param {Object} referenceSolutionService
 * @returns {Promise<{ valid: boolean, output?: string, exitCode?: number, timedOut?: boolean, error?: string }>}
 */
async function validateExecution(solutionId, inputToRun, referenceSolutionService) {
  try {
    const result = await referenceSolutionService.runAgainstInput(solutionId, inputToRun);

    if (result.timedOut) {
      return { valid: false, timedOut: true, error: 'Reference solution timed out (TLE)' };
    }

    if (result.exitCode !== 0 && !result.stdout) {
      return {
        valid: false,
        exitCode: result.exitCode,
        error: `Reference solution crashed with non-zero exit code: ${result.stderr || result.exitCode}`,
      };
    }

    return {
      valid: true,
      output: result.stdout || '',
      exitCode: result.exitCode,
      timedOut: false,
    };
  } catch (err) {
    return { valid: false, error: `Execution error: ${err.message}` };
  }
}

/**
 * Stage 3: Output Type & Integrity Validation.
 * Validates output conformances to returnType / format.
 *
 * @param {string} rawOutput
 * @param {Object} problem
 * @returns {{ valid: boolean, expectedOutput: string, expectedJson: *|null, error?: string }}
 */
function validateOutput(rawOutput, problem) {
  const isFunctionMode = problem.judge_mode === 'FUNCTION';
  const trimmed = (rawOutput || '').trim();

  if (!isFunctionMode) {
    // STDIN_STDOUT: output must exist
    return {
      valid: true,
      expectedOutput: trimmed,
      expectedJson: null,
    };
  }

  const sig = typeof problem.signature_metadata === 'string'
    ? JSON.parse(problem.signature_metadata || '{}')
    : (problem.signature_metadata || {});
  const returnType = (sig.returnType || 'Void').trim();

  if (returnType === 'Void') {
    return {
      valid: true,
      expectedOutput: 'null',
      expectedJson: null,
    };
  }

  // Parse structured JSON output from worker
  let parsed = null;
  let jsonExtracted = false;

  // Extract from potential wrapper logs (e.g. {"result": ...} or raw JSON)
  const lines = trimmed.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if ((line.startsWith('{') && line.endsWith('}')) || (line.startsWith('[') && line.endsWith(']')) || line === 'true' || line === 'false' || line === 'null' || !isNaN(Number(line))) {
      try {
        const candidateParsed = JSON.parse(line);
        if (candidateParsed && typeof candidateParsed === 'object' && 'result' in candidateParsed) {
          parsed = candidateParsed.result;
          jsonExtracted = true;
          break;
        } else {
          parsed = candidateParsed;
          jsonExtracted = true;
          break;
        }
      } catch (_) {}
    }
  }

  if (!jsonExtracted) {
    try {
      parsed = JSON.parse(trimmed);
      jsonExtracted = true;
    } catch (_) {
      parsed = trimmed;
    }
  }

  // Verify return type conformity
  if (returnType.startsWith('Array<') || returnType === 'LinkedList' || returnType === 'BinaryTree') {
    if (!Array.isArray(parsed)) {
      return {
        valid: false,
        error: `Expected Array return type for '${returnType}', but got ${typeof parsed}`,
      };
    }
  } else if (returnType === 'Integer' || returnType === 'Int' || returnType === 'Long' || returnType === 'Int64') {
    if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
      return {
        valid: false,
        error: `Expected Integer return type, but got ${typeof parsed}`,
      };
    }
  } else if (returnType === 'Boolean') {
    if (typeof parsed !== 'boolean') {
      return {
        valid: false,
        error: `Expected Boolean return type, but got ${typeof parsed}`,
      };
    }
  } else if (returnType === 'String') {
    if (typeof parsed !== 'string') {
      return {
        valid: false,
        error: `Expected String return type, but got ${typeof parsed}`,
      };
    }
  }

  return {
    valid: true,
    expectedOutput: typeof parsed === 'object' && parsed !== null ? JSON.stringify(parsed) : String(parsed),
    expectedJson: parsed,
  };
}

module.exports = {
  validateInput,
  validateExecution,
  validateOutput,
};
