import { sleep } from './helpers';

// Mock Data
const MOCK_PROBLEMS = [
  {
    id: '1',
    slug: 'two-sum',
    title: '1. Two Sum',
    difficulty: 'Easy',
    short_description: 'Find two numbers that add up to a target.',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    testCases: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' }
    ]
  },
  {
    id: '2',
    slug: 'add-two-numbers',
    title: '2. Add Two Numbers',
    difficulty: 'Medium',
    short_description: 'Add two numbers represented by linked lists.',
    description: `You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.`,
    testCases: [
      { input: 'l1 = [2,4,3], l2 = [5,6,4]', output: '[7,0,8]' }
    ]
  }
];

let MOCK_CHIRPS = [
  { id: '101', problemId: '1', author: 'alice', content: 'A hash map works perfectly here for O(n) time complexity!', createdAt: new Date().toISOString() },
  { id: '102', problemId: '1', author: 'bob', content: 'You can also sort and use two pointers, but it will be O(n log n).', createdAt: new Date().toISOString() }
];

// Mock API Functions
export const api = {
  getProblems: async (searchQuery = '') => {
    await sleep(500); // Simulate network delay
    const filtered = MOCK_PROBLEMS.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.short_description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { problems: filtered };
  },
  
  getProblem: async (slug) => {
    await sleep(500);
    const problem = MOCK_PROBLEMS.find(p => p.slug === slug);
    if (!problem) throw new Error('Problem not found');
    return { problem };
  },

  runCode: async (code, language) => {
    await sleep(1000);
    if (!code.trim()) {
      return { output: 'Error: Code is empty', error: true };
    }
    return { output: 'Mock execution successful.\nOutput: [0, 1]', error: false };
  },

  submitCode: async (problemId, code) => {
    await sleep(1500);
    // Mock randomly Accepted or Wrong Answer
    const isAccepted = Math.random() > 0.3; 
    return {
      verdict: isAccepted ? 'Accepted' : 'Wrong Answer',
      runtime: isAccepted ? '45ms' : 'N/A',
      memory: isAccepted ? '41.2MB' : 'N/A',
      details: isAccepted ? 'All test cases passed!' : 'Failed at test case 2: Output did not match expected.'
    };
  },

  getChirps: async (problemId) => {
    await sleep(300);
    return MOCK_CHIRPS.filter(c => c.problemId === problemId);
  },

  postChirp: async (problemId, content, author = 'Anonymous') => {
    await sleep(500);
    const newChirp = {
      id: Math.random().toString(36).substring(7),
      problemId,
      author,
      content,
      createdAt: new Date().toISOString()
    };
    MOCK_CHIRPS = [newChirp, ...MOCK_CHIRPS];
    return newChirp;
  }
};
