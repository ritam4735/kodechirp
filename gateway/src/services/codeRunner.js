// gateway/src/services/codeRunner.js
// ─────────────────────────────────────────────────────────────────────────────
// Local code execution using Docker/Podman sandbox
// Used as fallback when the Python worker service is unavailable
// ─────────────────────────────────────────────────────────────────────────────

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ── Language configuration ──────────────────────────────────────────────────

const LANGUAGE_CONFIG = {
  javascript: {
    extension: 'js',
    image: 'kodechirp-node-sandbox',
    memory: '64m',
    cpus: '0.5',
    tmpfsSize: '16m',
    runCommand: 'node main.js',
  },

  python: {
    extension: 'py',
    image: 'kodechirp-python-sandbox',
    memory: '64m',
    cpus: '0.5',
    tmpfsSize: '16m',
    runCommand: 'python main.py',
  },

  cpp: {
    extension: 'cpp',
    image: 'kodechirp-cpp-sandbox',
    memory: '256m',
    cpus: '1',
    tmpfsSize: '32m',
    runCommand: 'g++ main.cpp -O2 -std=c++17 -o main && ./main',
  },

  c: {
    extension: 'c',
    image: 'kodechirp-c-sandbox',
    memory: '256m',
    cpus: '1',
    tmpfsSize: '32m',
    runCommand: 'gcc main.c -O2 -std=c11 -o main && ./main',
  },

  java: {
    extension: 'java',
    image: 'kodechirp-java-sandbox',
    memory: '256m',
    cpus: '1',
    tmpfsSize: '32m',
    runCommand: 'javac main.java && java main',
  },
};

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
    '--tmpfs', `/tmp:size=${config.tmpfsSize},exec`,
    '--user', 'sandbox',
    '-v', `${runDir}:/app:Z`,
    '-w', '/app',
    config.image,
    'sh', '-c', config.runCommand,
  ];
}

// ── Core process runner ─────────────────────────────────────────────────────

function runProcess(command, args, stdin = '', timeoutMs = 5000) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const proc = spawn(command, args, {
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

    if (stdin) {
      proc.stdin.write(stdin, 'utf8', () => proc.stdin.end());
    } else {
      proc.stdin.end();
    }

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (!settled && !timedOut) {
        settled = true;
        // Strip podman warnings
        const podmanWarning = /Emulate Docker CLI using podman\. Create \/etc\/containers\/nodocker to quiet msg\.\s*/g;
        resolve({
          stdout: stdout.replace(podmanWarning, '').trim(),
          stderr: stderr.replace(podmanWarning, '').trim(),
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

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Execute code locally in a Docker/Podman sandbox.
 * @param {string} code - Source code
 * @param {string} language - Language identifier
 * @param {string} stdin - Standard input
 * @returns {Promise<{stdout, stderr, exitCode, timedOut}>}
 */
async function executeLocal(code, language, stdin = '') {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    return {
      stdout: '',
      stderr: `Unsupported language: ${language}`,
      exitCode: -1,
      timedOut: false,
    };
  }

  const id = uuidv4();
  const runDir = path.join(os.tmpdir(), `kc_run_${id}`);
  fs.mkdirSync(runDir, { recursive: true });
  fs.chmodSync(runDir, 0o777);

  const srcPath = path.join(runDir, `main.${config.extension}`);

  try {
    fs.writeFileSync(srcPath, code, 'utf8');
    fs.chmodSync(srcPath, 0o666);

    const dockerArgs = buildDockerArgs(config, runDir);
    const timeoutMs = (language === 'cpp' || language === 'c' || language === 'java') ? 15000 : 5000;

    const result = await runProcess('docker', dockerArgs, stdin, timeoutMs);

    logger.debug({
      language,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
    }, '[CodeRunner] Local execution complete');

    return result;
  } finally {
    try { fs.rmSync(runDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

module.exports = { executeLocal, LANGUAGE_CONFIG };
