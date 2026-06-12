export const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', extension: 'js' },
  { id: 'python', name: 'Python', extension: 'py' },
  { id: 'c', name: 'C', extension: 'c' },
  { id: 'cpp', name: 'C++', extension: 'cpp' },
];

export const DEFAULT_CODE_SNIPPETS = {
  javascript: `const fs = require("fs");

const input = fs.readFileSync(0, "utf8").trim();

function solve(input) {
    // Write your solution here
    console.log(input);
}

solve(input);
`,
  python: `import sys

def solve():
    data = sys.stdin.read().strip()

    # Write your solution here
    print(data)

if __name__ == "__main__":
    solve()
`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
  cpp: `#include <iostream>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
};
