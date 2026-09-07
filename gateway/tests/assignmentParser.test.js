const { parseAssignmentInput } = require('../src/utils/assignmentParser');

describe('assignmentParser', () => {
  test('parses multi-line LeetCode format with assignments', () => {
    const raw = `n = 4

board =
[
 [0,0,0,0],
 [0,1,0,0],
 [0,0,0,0],
 [0,0,1,0]
]`;

    const res = parseAssignmentInput(raw);
    expect(res).toEqual({
      n: 4,
      board: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 1, 0],
      ],
    });
  });

  test('parses single line assignments with comma separation', () => {
    const raw = 'nums = [2, 7, 11, 15], target = 9';
    const res = parseAssignmentInput(raw);
    expect(res).toEqual({
      nums: [2, 7, 11, 15],
      target: 9,
    });
  });

  test('handles strings with quotes and internal equals', () => {
    const raw = 's = "a=b,c=d", target = 42';
    const res = parseAssignmentInput(raw);
    expect(res).toEqual({
      s: 'a=b,c=d',
      target: 42,
    });
  });

  test('passes through valid JSON directly', () => {
    const raw = '{"n": 4, "board": [[0]]}';
    const res = parseAssignmentInput(raw);
    expect(res).toEqual({
      n: 4,
      board: [[0]],
    });
  });

  test('wraps single-param inputs when signature provided', () => {
    const raw = '[1, 2, 3]';
    const res = parseAssignmentInput(raw, { params: [{ name: 'nums', type: 'Array<Integer>' }] });
    expect(res).toEqual({
      nums: [1, 2, 3],
    });
  });
});
