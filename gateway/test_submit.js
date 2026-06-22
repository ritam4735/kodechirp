const { submitCode } = require('./src/services/submissionService');
const db = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');

async function main() {
    await connectRedis();

    const problemId = '55555555-5555-5555-5555-555555555555'; // Maximum Subarray
    const userId = '11111111-1111-1111-1111-111111111111'; // A random or existing user id

    const pyCode = `
def maxSubArray(nums, n):
    cur = 0
    m = -float('inf')
    for num in nums:
        cur += num
        m = max(m, cur)
        if cur < 0: cur = 0
    return m
`;
    console.log("Submitting Python...");
    let res = await submitCode({ problemId, code: pyCode, language: 'python', userId });
    console.log("Python:", res.submissionId);

    const jsCode = `
function maxSubArray(nums, n) {
    let cur = 0;
    let m = -Infinity;
    for (let num of nums) {
        cur += num;
        m = Math.max(m, cur);
        if (cur < 0) cur = 0;
    }
    return m;
}
`;
    console.log("Submitting JS...");
    res = await submitCode({ problemId, code: jsCode, language: 'javascript', userId });
    console.log("JS:", res.submissionId);

    const cCode = `
int maxSubArray(int* nums, int nums_len, int n) {
    int cur = 0;
    int m = -2147483648;
    for (int i = 0; i < nums_len; i++) {
        cur += nums[i];
        if (cur > m) m = cur;
        if (cur < 0) cur = 0;
    }
    return m;
}
`;
    console.log("Submitting C...");
    res = await submitCode({ problemId, code: cCode, language: 'c', userId });
    console.log("C:", res.submissionId);

    const cppCode = `
class Solution {
public:
    int maxSubArray(vector<int> nums, int n) {
        int cur = 0;
        int m = -2147483648;
        for (int i = 0; i < n; i++) {
            cur += nums[i];
            if (cur > m) m = cur;
            if (cur < 0) cur = 0;
        }
        return m;
    }
};
`;
    console.log("Submitting C++...");
    res = await submitCode({ problemId, code: cppCode, language: 'cpp', userId });
    console.log("C++:", res.submissionId);

    process.exit(0);
}

main().catch(console.error);
