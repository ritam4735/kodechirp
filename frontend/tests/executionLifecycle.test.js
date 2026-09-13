// frontend/tests/executionLifecycle.test.js
import assert from 'assert';
import { useEditorStore } from '../store/editorStore.js';

async function runTests() {
  console.log('--- Testing Execution Lifecycle & Panel State Management ---');

  // Test 1: Initial State
  {
    useEditorStore.getState().resetAll();
    const state = useEditorStore.getState();

    assert.strictEqual(state.execution.status, 'idle', 'Initial status should be idle');
    assert.strictEqual(state.execution.results, null, 'Initial results should be null');
    assert.strictEqual(state.execution.error, null, 'Initial error should be null');
    assert.strictEqual(state.activePanel, 'testcases', 'Initial activePanel should be testcases');
    assert.strictEqual(state.isExecuting, false, 'Initial isExecuting should be false');
    assert.strictEqual(state.output, '', 'Initial output should be empty');
    assert.strictEqual(state.testCaseResults, null, 'Initial testCaseResults should be null');
    console.log('✔ Test 1 passed: Initial state is clean and activePanel is "testcases"');
  }

  // Test 2: Start execution preserves existing test results and clears stale error
  {
    useEditorStore.getState().resetAll();
    // Simulate previous results and stale error
    const prevResults = [{ id: '1', status: 'Passed', yourOutput: '2' }];
    useEditorStore.getState().setTestCaseResults(prevResults);
    useEditorStore.getState().setOutput('Old compiler error');

    const reqId = useEditorStore.getState().startExecution();
    const state = useEditorStore.getState();

    assert.strictEqual(state.requestId, reqId, 'requestId should match generated reqId');
    assert.strictEqual(state.execution.status, 'running', 'Status should be running');
    assert.strictEqual(state.isExecuting, true, 'isExecuting should be true');
    assert.deepStrictEqual(state.execution.results, prevResults, 'Previous results must be preserved while running');
    assert.strictEqual(state.execution.error, null, 'Stale compiler/runtime error must be cleared');
    assert.strictEqual(state.output, '', 'Stale output must be cleared');
    console.log('✔ Test 2 passed: startExecution preserves results and clears stale error');
  }

  // Test 3: Successful execution transitions to success and switches activePanel to "testcases"
  {
    useEditorStore.getState().resetAll();
    // Start on console tab
    useEditorStore.getState().setActivePanel('console');
    const reqId = useEditorStore.getState().startExecution();

    const newResults = [
      { id: '1', status: 'Passed', yourOutput: '2', expectedOutput: '2' },
      { id: '2', status: 'Passed', yourOutput: '3', expectedOutput: '3' },
    ];
    useEditorStore.getState().setExecutionSuccess(reqId, newResults);
    const state = useEditorStore.getState();

    assert.strictEqual(state.execution.status, 'success', 'Status should be success');
    assert.deepStrictEqual(state.execution.results, newResults, 'Results must match new test results');
    assert.strictEqual(state.execution.error, null, 'Error must be null');
    assert.strictEqual(state.activePanel, 'testcases', 'activePanel must switch to "testcases" on success');
    assert.strictEqual(state.isExecuting, false, 'isExecuting must be false');
    assert.deepStrictEqual(state.testCaseResults, newResults, 'testCaseResults must match');
    assert.strictEqual(state.output, '', 'output must be empty string');
    console.log('✔ Test 3 passed: setExecutionSuccess switches activePanel to "testcases"');
  }

  // Test 4: Execution error transitions to error and switches activePanel to "console"
  {
    useEditorStore.getState().resetAll();
    const prevResults = [{ id: '1', status: 'Passed' }];
    useEditorStore.getState().setTestCaseResults(prevResults);

    const reqId = useEditorStore.getState().startExecution();
    const compilerError = 'SyntaxError: Unexpected identifier';
    useEditorStore.getState().setExecutionError(reqId, compilerError);
    const state = useEditorStore.getState();

    assert.strictEqual(state.execution.status, 'error', 'Status should be error');
    assert.strictEqual(state.execution.error, compilerError, 'Error message must be preserved');
    assert.strictEqual(state.output, compilerError, 'output must match error message');
    assert.strictEqual(state.activePanel, 'console', 'activePanel must switch to "console" on error');
    assert.strictEqual(state.isExecuting, false, 'isExecuting must be false');
    assert.deepStrictEqual(state.execution.results, prevResults, 'Previous test results should be preserved');
    console.log('✔ Test 4 passed: setExecutionError switches activePanel to "console" and preserves error');
  }

  // Test 5: Full reproduction cycle (Success -> Error -> Fixed Success -> Repeated cycles)
  {
    useEditorStore.getState().resetAll();

    // 1. Enter correct code & Run
    let reqId = useEditorStore.getState().startExecution();
    const correctResults = [{ id: '1', status: 'Passed' }, { id: '2', status: 'Passed' }];
    useEditorStore.getState().setExecutionSuccess(reqId, correctResults);
    let state = useEditorStore.getState();
    assert.strictEqual(state.activePanel, 'testcases', 'Cycle 1: Test Cases panel active after success');
    assert.strictEqual(state.execution.status, 'success');

    // 2. Introduce compile error & Run
    reqId = useEditorStore.getState().startExecution();
    assert.strictEqual(useEditorStore.getState().execution.status, 'running');
    useEditorStore.getState().setExecutionError(reqId, 'Compilation failed on line 3');
    state = useEditorStore.getState();
    assert.strictEqual(state.activePanel, 'console', 'Cycle 2: Console panel active after compile error');
    assert.strictEqual(state.execution.status, 'error');
    assert.strictEqual(state.output, 'Compilation failed on line 3');

    // 3. Fix code & Run again
    reqId = useEditorStore.getState().startExecution();
    state = useEditorStore.getState();
    assert.strictEqual(state.execution.error, null, 'Cycle 3: Stale error cleared when fixed run starts');
    assert.strictEqual(state.output, '', 'Cycle 3: Stale output cleared when fixed run starts');

    const fixedResults = [{ id: '1', status: 'Passed' }, { id: '2', status: 'Passed' }];
    useEditorStore.getState().setExecutionSuccess(reqId, fixedResults);
    state = useEditorStore.getState();
    assert.strictEqual(state.activePanel, 'testcases', 'Cycle 3: Test Cases panel automatically restored after fixing code');
    assert.strictEqual(state.execution.status, 'success');
    assert.strictEqual(state.execution.error, null);
    assert.strictEqual(state.output, '');

    // 4. Repeated cycle: another error then success
    reqId = useEditorStore.getState().startExecution();
    useEditorStore.getState().setExecutionError(reqId, 'RuntimeError: division by zero');
    assert.strictEqual(useEditorStore.getState().activePanel, 'console');

    reqId = useEditorStore.getState().startExecution();
    useEditorStore.getState().setExecutionSuccess(reqId, fixedResults);
    assert.strictEqual(useEditorStore.getState().activePanel, 'testcases');

    console.log('✔ Test 5 passed: Full Success -> Error -> Fixed Success cycle verified');
  }

  // Test 6: Race condition handling with overlapping executions
  {
    useEditorStore.getState().resetAll();

    // Start request 1 (slow execution)
    const req1 = useEditorStore.getState().startExecution();
    // Start request 2 before request 1 finishes (user triggered another run)
    const req2 = useEditorStore.getState().startExecution();

    assert.strictEqual(req2, req1 + 1, 'req2 must have higher sequence id');

    // Request 1 finishes late with an error
    useEditorStore.getState().setExecutionError(req1, 'Old slow request error');
    let state = useEditorStore.getState();
    assert.strictEqual(state.execution.status, 'running', 'Stale response from req1 must be ignored');
    assert.strictEqual(state.execution.error, null, 'Stale error from req1 must not be set');

    // Request 2 finishes successfully
    const req2Results = [{ id: '1', status: 'Passed' }];
    useEditorStore.getState().setExecutionSuccess(req2, req2Results);
    state = useEditorStore.getState();
    assert.strictEqual(state.execution.status, 'success', 'Latest req2 must succeed');
    assert.strictEqual(state.activePanel, 'testcases', 'Panel must be testcases');
    assert.deepStrictEqual(state.execution.results, req2Results, 'Results must belong to req2');

    console.log('✔ Test 6 passed: Stale responses and race conditions properly discarded');
  }

  // Test 7: Reset functionality
  {
    useEditorStore.getState().resetAll();
    const reqId = useEditorStore.getState().startExecution();
    useEditorStore.getState().setExecutionError(reqId, 'Some error');
    assert.strictEqual(useEditorStore.getState().activePanel, 'console');

    useEditorStore.getState().resetConsole();
    const state = useEditorStore.getState();
    assert.strictEqual(state.activePanel, 'testcases');
    assert.strictEqual(state.execution.status, 'idle');
    assert.strictEqual(state.output, '');
    assert.strictEqual(state.execution.error, null);
    assert.strictEqual(state.execution.results, null);
    console.log('✔ Test 7 passed: resetConsole resets execution and panel state to testcases');
  }

  console.log('\nAll 7 test suites passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
