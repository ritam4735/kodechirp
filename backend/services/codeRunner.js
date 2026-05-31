// backend/services/codeRunner.js
// ─────────────────────────────────────────────────────────────────────────────
// Secure Docker-based code execution sandbox
// Supports:
//   - JavaScript (Node.js)
//   - Python 3
//   - C++
//   - C
// ─────────────────────────────────────────────────────────────────────────────

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// ── Docker sandbox helper ───────────────────────────────────────────────────

function buildDockerArgs(config, runDir) {
  return [
    'run',
    '--rm',
    '-i',

    '--network=none',
    `--memory=${config.memory}`,
    `--cpus=${config.cpus}`,

    '--pids-limit=64',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',

    '--read-only',
    '--tmpfs',
    `/tmp:size=${config.tmpfsSize},exec`,

    '--user',
    'sandbox',

    '-v',
    `${runDir}:/app:Z`,

    '-w',
    '/app',

    config.image,

    'sh',
    '-c',
    config.runCommand
  ];
}

// ── Language configuration ──────────────────────────────────────────────────

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

// ── Core process runner ─────────────────────────────────────────────────────

function runProcess(command, args, stdin = '', timeoutMs = 5000) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const proc = spawn(command, args, {
      env: {
        PATH: process.env.PATH
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;

      proc.kill('SIGKILL');

      if (!settled) {
        settled = true;

        resolve({
          stdout: '',
          stderr: 'Time Limit Exceeded',
          exitCode: -1,
          timedOut: true
        });
      }
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    if (stdin) {
      proc.stdin.write(stdin, 'utf8', () => {
        proc.stdin.end();
      });
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
          timedOut: false
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);

      if (!settled) {
        settled = true;

        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: -1,
          timedOut: false
        });
      }
    });
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

exports.runCode = async function runCode(code, language, stdin = '') {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    return {
      stdout: '',
      stderr: `Unsupported language: ${language}`,
      exitCode: -1,
      timedOut: false
    };
  }

  const id = uuidv4();

  const tmpBase = os.tmpdir();
  const runDir = path.join(tmpBase, `kc_run_${id}`);

  fs.mkdirSync(runDir, { recursive: true });

  // Required so Docker sandbox user can access files
  fs.chmodSync(runDir, 0o777);

  const srcPath = path.join(
    runDir,
    `main.${config.extension}`
  );

  try {
    // Write source code
    fs.writeFileSync(srcPath, code, 'utf8');

    // Read/write for sandbox container
    fs.chmodSync(srcPath, 0o666);

    // Build secure Docker command
    const dockerArgs = buildDockerArgs(config, runDir);

    // C/C++ compilation needs longer timeout
    const timeoutMs =
      language === 'cpp' || language === 'c'
        ? 15000
        : 5000;

    // Execute inside Docker sandbox
    const result = await runProcess(
      'docker',
      dockerArgs,
      stdin,
      timeoutMs
    );

    return result;
  } finally {
    // Always cleanup execution directory
    try {
      fs.rmSync(runDir, {
        recursive: true,
        force: true
      });
    } catch (_) {
      // ignore cleanup errors
    }
  }
};