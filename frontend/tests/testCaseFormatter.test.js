// frontend/tests/testCaseFormatter.test.js
const assert = require('assert');
// Use dynamic import since frontend uses ES modules
async function runTests() {
  const {
    formatInput,
    formatOutput,
    formatMatrix,
    formatArrayOfStrings,
    formatLinkedList,
    formatBinaryTree,
    renderAsciiTree,
  } = await import('../lib/testCaseFormatter.js');

  console.log('Testing testCaseFormatter...');

  // 1. Single primitive: Backend {"n": 5} -> Display "n = 5"
  {
    const input = '{"n": 5}';
    const sig = { params: [{ name: 'n', type: 'Int' }] };
    const res = formatInput(input, sig);
    assert.strictEqual(res, 'n = 5', `Failed single primitive: got ${JSON.stringify(res)}`);
    console.log('✔ Single primitive passed');
  }

  // 2. Multiple primitive parameters: Backend {"n": 5, "k": 2} -> Display "n = 5\nk = 2"
  {
    const input = '{"n": 5, "k": 2}';
    const sig = { params: [{ name: 'n', type: 'Int' }, { name: 'k', type: 'Int' }] };
    const res = formatInput(input, sig);
    assert.strictEqual(res, 'n = 5\nk = 2', `Failed multiple primitives: got ${JSON.stringify(res)}`);
    console.log('✔ Multiple primitives passed');
  }

  // 3. Array: Backend {"nums":[1,2,3,4]} -> Display "nums = [1, 2, 3, 4]"
  {
    const input = '{"nums":[1,2,3,4]}';
    const sig = { params: [{ name: 'nums', type: 'Array<Int>' }] };
    const res = formatInput(input, sig);
    assert.strictEqual(res, 'nums = [1, 2, 3, 4]', `Failed array: got ${JSON.stringify(res)}`);
    console.log('✔ Array passed');
  }

  // 4. Matrix: Backend {"board":[[0,0,0],[1,0,1],[0,0,0]]}
  // Display:
  // board =
  //
  // [
  //   [0,0,0],
  //   [1,0,1],
  //   [0,0,0]
  // ]
  {
    const input = '{"board":[[0,0,0],[1,0,1],[0,0,0]]}';
    const sig = { params: [{ name: 'board', type: 'Matrix<Int>' }] };
    const expected = 'board =\n\n[\n  [0,0,0],\n  [1,0,1],\n  [0,0,0]\n]';
    const res = formatInput(input, sig);
    assert.strictEqual(res, expected, `Failed matrix: got \n${res}\nexpected\n${expected}`);
    console.log('✔ Matrix passed');
  }

  // 5. String: Backend {"s":"hello"} -> Display "s = \"hello\""
  {
    const input = '{"s":"hello"}';
    const sig = { params: [{ name: 's', type: 'String' }] };
    const res = formatInput(input, sig);
    assert.strictEqual(res, 's = "hello"', `Failed string: got ${JSON.stringify(res)}`);
    console.log('✔ String passed');
  }

  // 6. Character: Backend {"c":"a"} -> Display "c = 'a'"
  {
    const input = '{"c":"a"}';
    const sig = { params: [{ name: 'c', type: 'Character' }] };
    const res = formatInput(input, sig);
    assert.strictEqual(res, "c = 'a'", `Failed character: got ${JSON.stringify(res)}`);
    console.log('✔ Character passed');
  }

  // 7. Boolean: Backend {"flag": true} -> Display "flag = true"
  {
    const input = '{"flag": true}';
    const sig = { params: [{ name: 'flag', type: 'Boolean' }] };
    const res = formatInput(input, sig);
    assert.strictEqual(res, 'flag = true', `Failed boolean: got ${JSON.stringify(res)}`);
    console.log('✔ Boolean passed');
  }

  // 8. Linked List: Backend {"head":[1,2,3,4]} -> Display "head = 1 -> 2 -> 3 -> 4"
  {
    const input = '{"head":[1,2,3,4]}';
    const sig = { params: [{ name: 'head', type: 'LinkedList' }] };
    const res = formatInput(input, sig);
    assert.strictEqual(res, 'head = 1 -> 2 -> 3 -> 4', `Failed linked list: got ${JSON.stringify(res)}`);
    console.log('✔ Linked list passed');
  }

  // 9. Binary Tree: Backend {"root":[1,2,3,null,4]}
  {
    const input = '{"root":[1,2,3,null,4]}';
    const sig = { params: [{ name: 'root', type: 'BinaryTree' }] };
    const res = formatInput(input, sig);
    assert(res.startsWith('root ='), 'Binary tree should start with root =');
    assert(res.includes('1'), 'Binary tree should contain 1');
    assert(res.includes('2'), 'Binary tree should contain 2');
    console.log('✔ Binary tree rendering:\n' + res);
  }

  // 10. Rat in a Maze: Parameter order n before maze, pretty-printed matrix
  {
    const input = JSON.stringify({
      maze: [
        [1, 0, 0, 0],
        [1, 1, 0, 1],
        [1, 1, 0, 0],
        [0, 1, 1, 1]
      ],
      n: 4
    });
    const sig = {
      params: [
        { name: 'n', type: 'Int' },
        { name: 'maze', type: 'Matrix<Int>' }
      ]
    };
    const expected = 'n = 4\n\nmaze =\n\n[\n  [1,0,0,0],\n  [1,1,0,1],\n  [1,1,0,0],\n  [0,1,1,1]\n]';
    const res = formatInput(input, sig);
    assert.strictEqual(res, expected, `Failed Rat in a Maze:\ngot:\n${res}\nexpected:\n${expected}`);
    console.log('✔ Rat in a maze parameter order & formatting passed');
  }

  // 11. N Queens: Parameter order n before board, 1x1 matrix pretty-printed
  {
    const input = '{"board":[[0]],"n":1}';
    const sig = {
      params: [
        { name: 'n', type: 'Int' },
        { name: 'board', type: 'Matrix<Int>' }
      ]
    };
    const expected = 'n = 1\n\nboard =\n\n[\n  [0]\n]';
    const res = formatInput(input, sig);
    assert.strictEqual(res, expected, `Failed N Queens:\ngot:\n${res}\nexpected:\n${expected}`);
    console.log('✔ N Queens parameter order & formatting passed');
  }

  // 12. Climbing Stairs: {"n":4} -> "n = 4"
  {
    const input = '{"n":4}';
    const sig = { params: [{ name: 'n', type: 'Int' }] };
    const res = formatInput(input, sig);
    assert.strictEqual(res, 'n = 4', `Failed Climbing Stairs: got ${JSON.stringify(res)}`);
    console.log('✔ Climbing Stairs passed');
  }

  // 13. Output Formatting:
  // Primitive: 7
  assert.strictEqual(formatOutput(7, 'Int'), '7');
  assert.strictEqual(formatOutput('7', 'Int'), '7');

  // String: "hello"
  assert.strictEqual(formatOutput('"hello"', 'String'), '"hello"');
  assert.strictEqual(formatOutput('hello', 'String'), '"hello"');

  // Array: [1,2,3]
  assert.strictEqual(formatOutput('[1,2,3]', 'Array<Int>'), '[1,2,3]');

  // Array of Strings:
  // [
  //   "DDRDRR",
  //   "DRDDRR"
  // ]
  const expectedStrArr = '[\n  "DDRDRR",\n  "DRDDRR"\n]';
  assert.strictEqual(formatOutput('["DDRDRR","DRDDRR"]', 'Array<String>'), expectedStrArr);

  // Matrix:
  // [
  //   [1,2],
  //   [3,4]
  // ]
  const expectedMatrix = '[\n  [1,2],\n  [3,4]\n]';
  assert.strictEqual(formatOutput('[[1,2],[3,4]]', 'Matrix<Int>'), expectedMatrix);

  // Boolean: true
  assert.strictEqual(formatOutput('true', 'Boolean'), 'true');
  assert.strictEqual(formatOutput(true, 'Boolean'), 'true');

  // Linked List: 1 -> 2 -> 3 -> 4
  assert.strictEqual(formatOutput('[1,2,3,4]', 'LinkedList'), '1 -> 2 -> 3 -> 4');

  // Edge Cases
  {
    // Object input directly
    const objInput = { n: 5, nums: [1, 2] };
    const res = formatInput(objInput);
    assert(res.includes('n = 5') && res.includes('nums = [1, 2]'));

    // Null/undefined input
    assert.strictEqual(formatInput(null), '');
    assert.strictEqual(formatInput(''), '');

    // Unparseable plain text (STDIN mode)
    const plain = '5\n1 2 3 4 5';
    assert.strictEqual(formatInput(plain), plain);

    // Empty array/matrix
    assert.strictEqual(formatMatrix([]), '[]');
    assert.strictEqual(formatArrayOfStrings([]), '[]');
    assert.strictEqual(formatLinkedList([]), '[]');

    // Output null
    assert.strictEqual(formatOutput(null), 'null');
    assert.strictEqual(formatOutput('null'), 'null');
    assert.strictEqual(formatOutput(undefined), 'null');

    console.log('✔ Edge cases passed');
  }

  console.log('\nAll testCaseFormatter tests passed successfully! 🎉');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

