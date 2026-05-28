export const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', extension: 'js' },
  { id: 'python', name: 'Python', extension: 'py' },
  { id: 'cpp', name: 'C++', extension: 'cpp' },
];

export const DEFAULT_CODE_SNIPPETS = {
  javascript: `function solve() {\n  // Write your code here\n}\n`,
  python: `def solve():\n    # Write your code here\n    pass\n`,
  cpp: `#include <iostream>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
};
