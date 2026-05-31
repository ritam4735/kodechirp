// backend/services/codeRunner.js
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: this file previously only exported `notImplemented`.
// Now it uses child_process.spawn to actually execute code in a sandboxed
// subprocess, pipe stdin (test case input), capture stdout/stderr, and enforce
// a hard wall-clock timeout.
//
// Supported languages:  javascript (Node.js), python (Python 3), cpp (g++)
// ─────────────────────────────────────────────────────────────────────────────

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// ── Language configuration ────────────────────────────────────────────────────

const LANGUAGE_CONFIG = {
  javascript: {
    extension: 'js',
    image: 'kodechirp-node-sandbox',
    memory: '64m',
    cpus: '0.5',
    tmpfsSize: '16m',
    runCommand: 'node main.js'
  },
  python: {
    extension: 'py',
    image: 'kodechirp-python-sandbox',
    memory: '64m',
    cpus: '0.5',
    tmpfsSize: '16m',
    runCommand: 'python main.py'
  },
  cpp: {
    extension: 'cpp',
    image: 'kodechirp-cpp-sandbox',
    memory: '256m',
    cpus: '1',
    tmpfsSize: '32m',
    runCommand: 'g++ main.cpp -O2 -std=c++17 -o main && ./main'
  },
  c: {
    extension: 'c',
    image: 'kodechirp-c-sandbox',
    memory: '256m',
    cpus: '1',
    tmpfsSize: '32m',
    runCommand: 'gcc main.c -O2 -std=c11 -o main && ./main'
  }
};

// ── Core executor ─────────────────────────────────────────────────────────────

/**
 * Spawn a subprocess, write stdin, capture stdout/stderr, enforce timeout.
 *
 * @param {string}  command
 * @param {string[]} args
 * @param {string}  stdin      — content to pipe into the process's stdin
 * @param {number}  timeoutMs  — kill the process after this many ms
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, timedOut: boolean }>}
 */
function runProcess(command, args, stdin = '', timeoutMs = 5000) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const proc = spawn(command, args, {
      // Restrict environment to only what is needed
      env: { PATH: process.env.PATH },
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
      if (!settled) {
        settled = true;
        resolve({ stdout: '', stderr: 'Time Limit Exceeded', exitCode: -1, timedOut: true });
      }
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    // Write stdin then close the stream so the process doesn't hang waiting for input
    if (stdin) {
      proc.stdin.write(stdin, 'utf8', () => proc.stdin.end());
    } else {
      proc.stdin.end();
    }

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (!settled && !timedOut) {
        settled = true;
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 0,
          timedOut: false,
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve({ stdout: '', stderr: err.message, exitCode: -1, timedOut: false });
      }
    });
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Execute arbitrary source code with optional stdin input.
 *
 * @param {string} code      — full source text to run
 * @param {string} language  — 'javascript' | 'python' | 'cpp'
 * @param {string} stdin     — text to pass on stdin (e.g. a test-case input)
 * @returns {Promise<{ stdout, stderr, exitCode, timedOut }>}
 */
exports.runCode = async function runCode(code, language, stdin = '') {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { stdout: '', stderr: `Unsupported language: ${language}`, exitCode: -1, timedOut: false };
  }

  const id = uuidv4();
  const tmpBase = os.tmpdir();
  const runDir = path.join(tmpBase, `kc_run_${id}`);

  // Create isolated execution directory
  fs.mkdirSync(runDir, { recursive: true });
  // Ensure the directory is fully accessible by the Docker sandbox user
  fs.chmodSync(runDir, 0o777);

  const srcPath = path.join(runDir, `main.${config.extension}`);

  try {
    fs.writeFileSync(srcPath, code, 'utf8');
    fs.chmodSync(srcPath, 0o666);

    // ── Unified Docker Sandbox Execution ──────────────────────────────────────
    const dockerArgs = [
      'run', '--rm',
      '--network=none',
      `--memory=${config.memory}`,
      `--cpus=${config.cpus}`,
      '--pids-limit=64',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--read-only',
      '--tmpfs', `/tmp:size=${config.tmpfsSize},exec`,
      '--user', 'sandbox',
      '-v', `${runDir}:/app:Z`,
      '-w', '/app',
      config.image,
      'sh', '-c', config.runCommand
    ];
    
    // Give compiled languages 15s budget, interpreted 5s budget
    const timeoutMs = (language === 'cpp' || language === 'c') ? 15_000 : 5_000;
    
    const result = await runProcess('docker', dockerArgs, stdin, timeoutMs);
    return result;

  } finally {
    // Always clean up temp directory recursively — never leave user code on disk
    try { fs.rmSync(runDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
};
