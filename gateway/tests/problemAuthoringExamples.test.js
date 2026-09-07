const request = require('supertest');
const { parseProblem } = require('../src/services/problemParser');
const normalizationService = require('../src/services/problemNormalizationService');

describe('Problem Authoring Examples & Validation', () => {
  describe('Deterministic parser fallback for examples', () => {
    it('extracts examples from markdown description correctly', () => {
      const description = `
You are given an array of integers \`nums\` and an integer \`target\`.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Constraints:
2 <= nums.length <= 10^4
`;

      const result = parseProblem(description);
      expect(result.parsed.examples).toHaveLength(2);
      expect(result.parsed.examples[0].input).toBe('nums = [2,7,11,15], target = 9');
      expect(result.parsed.examples[0].output).toBe('[0,1]');
      expect(result.parsed.examples[0].explanation).toBe('Because nums[0] + nums[1] == 9, we return [0, 1].');
      expect(result.parsed.examples[1].input).toBe('nums = [3,2,4], target = 6');
      expect(result.parsed.examples[1].output).toBe('[1,2]');
    });
  });

  describe('AI configuration check', () => {
    it('returns a boolean for isAIConfigured', () => {
      const isConfigured = normalizationService.isAIConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });

    it('returns structured status from getAIStatus', () => {
      const status = normalizationService.getAIStatus();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('model');
    });
  });
});
