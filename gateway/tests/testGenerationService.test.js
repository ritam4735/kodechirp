// gateway/tests/testGenerationService.test.js
'use strict';

const {
  parseConstraintsBounds,
  correlateFunctionParameters,
  validateCandidateInput,
} = require('../src/services/testGenerationService');

describe('testGenerationService Core Improvements', () => {
  describe('1. Enhanced Constraint Bounds Parsing', () => {
    test('parses discrete sets like maze[i][j] in {0, 1} and dimension 2 <= N <= 10', () => {
      const constraints = '2 <= N <= 10\nmaze[i][j] in {0, 1}';
      const bounds = parseConstraintsBounds(null, constraints);

      expect(bounds.minLen).toBe(2);
      expect(bounds.maxLen).toBe(10);
      expect(bounds.allowedValues).toEqual([0, 1]);
      expect(bounds.minVal).toBe(0);
      expect(bounds.maxVal).toBe(1);
    });

    test('parses mathematical notation x ∈ {0, 1}', () => {
      const constraints = 'x ∈ {0, 1}';
      const bounds = parseConstraintsBounds(null, constraints);
      expect(bounds.allowedValues).toEqual([0, 1]);
    });

    test('parses belongs to phrasing', () => {
      const constraints = 'each cell belongs to {0, 1}';
      const bounds = parseConstraintsBounds(null, constraints);
      expect(bounds.allowedValues).toEqual([0, 1]);
    });

    test('parses verbal phrasing "either 0 or 1" and "binary grid"', () => {
      const bounds1 = parseConstraintsBounds(null, 'values are either 0 or 1');
      expect(bounds1.allowedValues).toEqual([0, 1]);

      const bounds2 = parseConstraintsBounds(null, 'Given a binary matrix of size n x n');
      expect(bounds2.allowedValues).toEqual([0, 1]);
    });

    test('parses dimension bounds for rows and cols', () => {
      const bounds = parseConstraintsBounds(null, '1 <= rows <= 50, 1 <= cols <= 50, -100 <= val <= 100');
      expect(bounds.minLen).toBe(1);
      expect(bounds.maxLen).toBe(50);
      expect(bounds.minVal).toBe(-100);
      expect(bounds.maxVal).toBe(100);
    });
  });

  describe('2. Generic Matrix Parameter Correlation', () => {
    const rng = () => 0.5;

    test('correlates single dimension N with square matrix (maze, n)', () => {
      const params = [
        { name: 'maze', type: 'Matrix<Integer>' },
        { name: 'n', type: 'Integer' },
      ];
      const bounds = { minLen: 4, maxLen: 4, allowedValues: [0, 1] };
      const inputObj = {};

      correlateFunctionParameters(inputObj, params, 'random_small', rng, bounds);

      expect(inputObj.n).toBe(4);
      expect(Array.isArray(inputObj.maze)).toBe(true);
      expect(inputObj.maze.length).toBe(4);
      for (const row of inputObj.maze) {
        expect(row.length).toBe(4);
        for (const cell of row) {
          expect([0, 1]).toContain(cell);
        }
      }
    });

    test('correlates dual dimensions (image, rows, cols)', () => {
      const params = [
        { name: 'image', type: 'Matrix<Integer>' },
        { name: 'rows', type: 'Integer' },
        { name: 'cols', type: 'Integer' },
      ];
      const bounds = { minLen: 3, maxLen: 5, minVal: 0, maxVal: 255 };
      const inputObj = {};

      correlateFunctionParameters(inputObj, params, 'normal', rng, bounds);

      expect(typeof inputObj.rows).toBe('number');
      expect(typeof inputObj.cols).toBe('number');
      expect(inputObj.image.length).toBe(inputObj.rows);
      expect(inputObj.image[0].length).toBe(inputObj.cols);
    });
  });

  describe('3. Pre-Execution Candidate Validator', () => {
    const problem = {
      judge_mode: 'FUNCTION',
      signature_metadata: {
        name: 'findPath',
        params: [
          { name: 'maze', type: 'Matrix<Integer>' },
          { name: 'n', type: 'Integer' },
        ],
        returnType: 'Array<String>',
      },
    };
    const bounds = { minLen: 2, maxLen: 10, allowedValues: [0, 1] };

    test('rejects empty matrix rows like [[]]', () => {
      const candidate = {
        input_json: {
          maze: [[]],
          n: 0,
        },
      };
      const result = validateCandidateInput(candidate, problem, bounds);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not a non-empty array');
    });

    test('rejects jagged matrix', () => {
      const candidate = {
        input_json: {
          maze: [[1, 0], [1]],
          n: 2,
        },
      };
      const result = validateCandidateInput(candidate, problem, bounds);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('jagged');
    });

    test('rejects mismatched dimensions where n != matrix length', () => {
      const candidate = {
        input_json: {
          maze: [[1, 0], [0, 1]],
          n: 100, // Bug that was causing exit=139 segfault
        },
      };
      const result = validateCandidateInput(candidate, problem, bounds);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Matrix dimension mismatch');
    });

    test('rejects values outside allowed set', () => {
      const candidate = {
        input_json: {
          maze: [[1, -17], [20, 1]], // Negative numbers like in the user's log
          n: 2,
        },
      };
      const result = validateCandidateInput(candidate, problem, bounds);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not in allowed set');
    });

    test('accepts valid correlated candidate', () => {
      const candidate = {
        input_json: {
          maze: [[1, 0, 1], [0, 1, 0], [1, 1, 1]],
          n: 3,
        },
      };
      const result = validateCandidateInput(candidate, problem, bounds);
      expect(result.valid).toBe(true);
    });
  });
});
