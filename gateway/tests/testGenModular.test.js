// gateway/tests/testGenModular.test.js
'use strict';

const {
  planCategoryDistribution,
  generateDeterministicSuite,
  runQualityChecks,
} = require('../src/services/testGen/engine');
const {
  validateInput,
  validateExecution,
  validateOutput,
} = require('../src/services/testGen/validator');
const {
  stringToSeed,
  createPRNG,
  randInt,
  choice,
  shuffle,
  sample,
} = require('../src/services/testGen/prng');
const {
  inferLineStructure,
  generateStdinInput,
} = require('../src/services/testGen/generators/stdinGenerators');
const {
  validateAuthoringPayload,
} = require('../src/services/problemAuthoringService');
const {
  isAIConfigured,
} = require('../src/services/testGenerationService');
const referenceSolutionService = require('../src/services/referenceSolutionService');
const db = require('../src/config/database');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

describe('Modular Deterministic Test Generation & Problem Authoring Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Six Mandatory Test Categories Coverage', () => {
    const categories = ['normal', 'boundary', 'corner', 'randomized', 'stress', 'pathological'];

    test('plans distribution covering all 6 mandatory categories', () => {
      const distribution = planCategoryDistribution(36);
      const plannedCats = distribution.map(d => d.category);

      for (const cat of categories) {
        expect(plannedCats).toContain(cat);
      }

      const totalPlanned = distribution.reduce((sum, d) => sum + d.count, 0);
      expect(totalPlanned).toBe(36);
    });

    test('generates candidate test suite featuring all 6 categories in FUNCTION mode', () => {
      const problem = {
        id: 'p-two-sum',
        title: 'Two Sum',
        judge_mode: 'FUNCTION',
        signature_metadata: {
          name: 'twoSum',
          params: [
            { name: 'nums', type: 'Array<Integer>' },
            { name: 'target', type: 'Integer' },
          ],
          returnType: 'Array<Integer>',
        },
        constraints: '$2 \\le nums.length \\le 10^4$, $-10^4 \\le nums[i] \\le 10^4$',
      };

      const suite = generateDeterministicSuite(problem, [], 'fixed-seed', 36);
      expect(suite.length).toBeGreaterThanOrEqual(30);

      const generatedCats = new Set(suite.map(tc => tc.category));
      for (const cat of categories) {
        expect(generatedCats.has(cat)).toBe(true);
      }

      // Check quality reporting correctly identifies all 6 categories
      const quality = runQualityChecks(suite);
      expect(quality.coverageFlags.hasNormal).toBe(true);
      expect(quality.coverageFlags.hasBoundary).toBe(true);
      expect(quality.coverageFlags.hasCorner).toBe(true);
      expect(quality.coverageFlags.hasRandomized).toBe(true);
      expect(quality.coverageFlags.hasStress).toBe(true);
      expect(quality.coverageFlags.hasPathological).toBe(true);
    });

    test('generates candidate test suite in STDIN_STDOUT mode', () => {
      const problem = {
        id: 'p-stdin-problem',
        title: 'Array Sum STDIN',
        judge_mode: 'STDIN_STDOUT',
        constraints: '1 <= n <= 100\n-100 <= val <= 100',
      };

      const suite = generateDeterministicSuite(problem, ['3\n10 20 30'], 'fixed-seed-stdin', 30);
      expect(suite.length).toBeGreaterThanOrEqual(25);

      const generatedCats = new Set(suite.map(tc => tc.category));
      expect(generatedCats.has('boundary')).toBe(true);
      expect(generatedCats.has('pathological')).toBe(true);
      expect(generatedCats.has('stress')).toBe(true);

      for (const tc of suite) {
        expect(typeof tc.input).toBe('string');
        expect(tc.input.length).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Multi-Stage Validator', () => {
    const problem = {
      id: 'p-val-test',
      judge_mode: 'FUNCTION',
      signature_metadata: {
        name: 'solve',
        params: [
          { name: 'nums', type: 'Array<Integer>' },
          { name: 'flag', type: 'Boolean' },
          { name: 'count', type: 'Integer' },
        ],
        returnType: 'Array<Integer>',
      },
    };
    const bounds = { minVal: -100, maxVal: 100, minLen: 0, maxLen: 100 };

    describe('Stage 1: Input Schema & Bounds Validation', () => {
      test('accepts properly typed inputs matching signature params', () => {
        const validCandidate = {
          input_json: { nums: [1, 2, 3], flag: true, count: 3 },
          category: 'normal',
        };
        const result = validateInput(validCandidate, problem, bounds);
        expect(result.valid).toBe(true);
      });

      test('rejects missing parameter in FUNCTION mode', () => {
        const invalidCandidate = {
          input_json: { nums: [1, 2, 3], flag: true }, // missing 'count'
          category: 'normal',
        };
        const result = validateInput(invalidCandidate, problem, bounds);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Missing required parameter 'count'");
      });

      test('rejects type mismatch (e.g. string for integer, number for array)', () => {
        const invalidCandidate1 = {
          input_json: { nums: [1, 2, 3], flag: true, count: 'three' },
          category: 'normal',
        };
        expect(validateInput(invalidCandidate1, problem, bounds).valid).toBe(false);

        const invalidCandidate2 = {
          input_json: { nums: 'not-an-array', flag: true, count: 3 },
          category: 'normal',
        };
        expect(validateInput(invalidCandidate2, problem, bounds).valid).toBe(false);
      });

      test('validates STDIN_STDOUT string inputs', () => {
        const stdinProb = { judge_mode: 'STDIN_STDOUT' };
        expect(validateInput({ input: '123\n456' }, stdinProb, bounds).valid).toBe(true);
        expect(validateInput({ input: null }, stdinProb, bounds).valid).toBe(false);
      });
    });

    describe('Stage 2: Execution Integrity Validation', () => {
      test('flags execution timeouts and crashes', async () => {
        const mockRunner = {
          runAgainstInput: jest.fn().mockResolvedValue({
            stdout: '',
            stderr: 'Segmentation fault',
            exitCode: 139,
            timedOut: false,
          }),
        };

        const result = await validateExecution('sol-1', 'input', mockRunner);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('crashed');

        mockRunner.runAgainstInput.mockResolvedValueOnce({
          stdout: '',
          stderr: '',
          exitCode: 0,
          timedOut: true,
        });
        const timeoutRes = await validateExecution('sol-1', 'input', mockRunner);
        expect(timeoutRes.valid).toBe(false);
        expect(timeoutRes.timedOut).toBe(true);
      });

      test('accepts clean execution', async () => {
        const mockRunner = {
          runAgainstInput: jest.fn().mockResolvedValue({
            stdout: '[1, 2]',
            stderr: '',
            exitCode: 0,
            timedOut: false,
          }),
        };

        const result = await validateExecution('sol-1', 'input', mockRunner);
        expect(result.valid).toBe(true);
        expect(result.output).toBe('[1, 2]');
      });
    });

    describe('Stage 3: Output Type & Integrity Validation', () => {
      test('validates and extracts return type for structured Array output', () => {
        const result = validateOutput('[1, 2, 3]', problem);
        expect(result.valid).toBe(true);
        expect(result.expectedJson).toEqual([1, 2, 3]);
      });

      test('validates wrapper object output {"result": [1, 2]}', () => {
        const result = validateOutput('{"result": [1, 2]}', problem);
        expect(result.valid).toBe(true);
        expect(result.expectedJson).toEqual([1, 2]);
      });

      test('rejects return type mismatch (e.g. integer when Array expected)', () => {
        const result = validateOutput('42', problem);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Expected Array return type');
      });

      test('validates Boolean return type', () => {
        const boolProb = {
          judge_mode: 'FUNCTION',
          signature_metadata: { returnType: 'Boolean' },
        };
        const resTrue = validateOutput('true', boolProb);
        expect(resTrue.valid).toBe(true);
        expect(resTrue.expectedJson).toBe(true);

        const resInvalid = validateOutput('[1, 2]', boolProb);
        expect(resInvalid.valid).toBe(false);
      });
    });
  });

  describe('3. Zero AI Bulk Generation Guarantee & PRNG Determinism', () => {
    test('isAIConfigured is disabled for bulk test generation', () => {
      expect(isAIConfigured()).toBe(false);
    });

    test('Mulberry32 PRNG guarantees 100% deterministic reproducibility', () => {
      const rng1 = createPRNG('reproducible-seed-123');
      const rng2 = createPRNG('reproducible-seed-123');

      const seq1 = Array.from({ length: 50 }, () => rng1());
      const seq2 = Array.from({ length: 50 }, () => rng2());

      expect(seq1).toEqual(seq2);
    });

    test('helper functions choice, shuffle, and sample behave deterministically', () => {
      const rng1 = createPRNG(42);
      const rng2 = createPRNG(42);

      const items = [10, 20, 30, 40, 50];
      expect(shuffle(items, rng1)).toEqual(shuffle(items, rng2));

      const rng3 = createPRNG(99);
      const rng4 = createPRNG(99);
      expect(sample(items, 3, rng3)).toEqual(sample(items, 3, rng4));
    });
  });

  describe('4. Authoring Payload Validation & Verification Status Isolation', () => {
    test('rejects authoring payload when verification cases are fewer than 2', () => {
      const invalidPayload = {
        title: 'Problem With 1 Case',
        referenceSolution: { language: 'python', source_code: 'def solve(): pass' },
        verificationCases: [{ input: '1', expected_output: '1' }],
      };

      const result = validateAuthoringPayload(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('At least 2-3 verification test cases'))).toBe(true);
    });

    test('accepts valid authoring payload with 2-3 verification test cases', () => {
      const validPayload = {
        title: 'Two Sum Authoring',
        referenceSolution: { language: 'python', source_code: 'def twoSum(nums, target): return [0, 1]' },
        verificationCases: [
          { input: '{"nums":[2,7,11,15],"target":9}', expected_output: '[0,1]' },
          { input: '{"nums":[3,2,4],"target":6}', expected_output: '[1,2]' },
        ],
      };

      const result = validateAuthoringPayload(validPayload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('referenceSolutionService.verify fails if fewer than 2 verification cases exist', async () => {
      db.query.mockImplementation((sql) => {
        if (sql.includes('FROM reference_solutions WHERE id = $1')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: 'sol-1', problem_id: 'prob-1', language: 'python', source_code: 'def f(): pass' }],
          });
        }
        if (sql.includes('FROM problems WHERE id = $1')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: 'prob-1', judge_mode: 'FUNCTION', signature_metadata: {} }],
          });
        }
        if (sql.includes('FROM test_cases')) {
          // Only 1 example test case!
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: 'tc-1', input: '1', expected_output: '1' }],
          });
        }
        if (sql.includes('UPDATE reference_solutions')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const verification = await referenceSolutionService.verify('sol-1');
      expect(verification.examplesOk).toBe(false);
      expect(verification.errors.some(e => e.includes('At least 2-3 verification test cases'))).toBe(true);
    });

    test('referenceSolutionService.verify updates ONLY passed test case IDs (no status bleed)', async () => {
      const executedQueries = [];
      db.query.mockImplementation((sql, params) => {
        executedQueries.push({ sql, params });
        if (sql.includes('FROM reference_solutions WHERE id = $1')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: 'sol-1', problem_id: 'prob-1', language: 'python', source_code: 'def f(): pass' }],
          });
        }
        if (sql.includes('FROM problems WHERE id = $1')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: 'prob-1', judge_mode: 'STDIN_STDOUT' }],
          });
        }
        if (sql.includes('FROM test_cases') && sql.includes('is_sample = TRUE')) {
          // 2 verification cases
          return Promise.resolve({
            rowCount: 2,
            rows: [
              { id: 'tc-verif-1', input: '1', expected_output: '2' },
              { id: 'tc-verif-2', input: '2', expected_output: '3' },
            ],
          });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      // Mock submissionService.runCode via require
      const submissionService = require('../src/services/submissionService');
      jest.spyOn(submissionService, 'runCode').mockImplementation(({ stdin }) => {
        return Promise.resolve({
          stdout: stdin === '1' ? '2\n' : '3\n',
          stderr: '',
          exitCode: 0,
          timedOut: false,
        });
      });

      const verification = await referenceSolutionService.verify('sol-1');
      expect(verification.examplesOk).toBe(true);

      // Verify that the UPDATE test_cases query used WHERE id = ANY($1) with ONLY the 2 verified IDs
      const updateTcQuery = executedQueries.find(q =>
        q.sql.includes('UPDATE test_cases SET verified = TRUE WHERE id = ANY($1)')
      );
      expect(updateTcQuery).toBeDefined();
      expect(updateTcQuery.params[0]).toEqual(['tc-verif-1', 'tc-verif-2']);

      // Ensure NO query updated test_cases with WHERE problem_id = $1 (preventing status bleed)
      const bleedQuery = executedQueries.find(q =>
        q.sql.includes('UPDATE test_cases SET verified = TRUE WHERE problem_id = $1')
      );
      expect(bleedQuery).toBeUndefined();

      submissionService.runCode.mockRestore();
    });
  });

  describe('5. STDIN Format Inference & Generation', () => {
    test('inferLineStructure correctly detects multi-line token structures', () => {
      const examples = ['3\n10 20 30'];
      const structure = inferLineStructure(examples);
      expect(structure).toEqual([
        { count: 1, isNum: true },
        { count: 3, isNum: true },
      ]);
    });

    test('generateStdinInput formats line-based STDIN matching inferred structure', () => {
      const structure = [
        { count: 1, isNum: true },
        { count: 3, isNum: true },
      ];
      const bounds = { minVal: 1, maxVal: 50, minLen: 1, maxLen: 10 };
      const rng = createPRNG(12345);

      const stdinCase = generateStdinInput('boundary', 0, rng, bounds, structure);
      const lines = stdinCase.trim().split('\n');
      expect(lines.length).toBe(2);

      const n = parseInt(lines[0], 10);
      const elements = lines[1].split(' ');
      expect(elements.length).toBe(n);
    });
  });
});
