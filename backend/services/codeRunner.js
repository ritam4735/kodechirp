// backend/services/codeRunner.js
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: this file previously only exported `notImplemented`.
// Now it uses child_process.spawn to actually execute code in a sandboxed
// subprocess, pipe stdin (test case input), capture stdout/stderr, and enforce
// a hard wall-clock timeout.
//
// Supported languages:  javascript (Node.js), python (Python 3), cpp (g++)
// ─────────────────────────────────────────────────────────────────────────────

const { spawn }  = require('child_process');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
const { v4: uuidv4 } = require('uuid');

// ── Language configuration ────────────────────────────────────────────────────

const LANGUAGE_CONFIG = {
  javascript: {
    extension: 'js',
    run: (filePath, tmpDir) => ({
      command: 'docker',
      args: ['run', '--rm', '-i', '--memory=64m', '--cpus=0.5', '--network=none', '-v', `${tmpDir}:/app`, '-w', '/app', 'node:18-alpine', 'node', path.basename(filePath)]
    }),
  },
  python: {
    extension: 'py',
    run: (filePath, tmpDir) => ({
      command: 'docker',
      args: ['run', '--rm', '-i', '--memory=64m', '--cpus=0.5', '--network=none', '-v', `${tmpDir}:/app`, '-w', '/app', 'python:3.10-alpine', 'python3', path.basename(filePath)]
    }),
  },
  cpp: {
    extension: 'cpp',
    compile: (srcPath, outPath, tmpDir) => ({
      command: 'docker',
      args: ['run', '--rm', '--memory=256m', '--cpus=1.0', '--network=none', '-v', `${tmpDir}:/app`, '-w', '/app', 'gcc:latest', 'g++', '-O2', '-o', path.basename(outPath), path.basename(srcPath)]
    }),
    run: (outPath, tmpDir) => ({
      command: 'docker',
      args: ['run', '--rm', '-i', '--memory=64m', '--cpus=0.5', '--network=none', '-v', `${tmpDir}:/app`, '-w', '/app', 'gcc:latest', `./${path.basename(outPath)}`]
    }),
  },
  c: {
    extension: 'c',
    compile: (srcPath, outPath, tmpDir) => ({
      command: 'docker',
      args: ['run', '--rm', '--memory=256m', '--cpus=1.0', '--network=none', '-v', `${tmpDir}:/app`, '-w', '/app', 'gcc:latest', 'gcc', '-O2', '-o', path.basename(outPath), path.basename(srcPath)]
    }),
    run: (outPath, tmpDir) => ({
      command: 'docker',
      args: ['run', '--rm', '-i', '--memory=64m', '--cpus=0.5', '--network=none', '-v', `${tmpDir}:/app`, '-w', '/app', 'gcc:latest', `./${path.basename(outPath)}`]
    }),
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
    let stdout    = '';
    let stderr    = '';
    let settled   = false;
    let timedOut  = false;

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
          stdout:   stdout.trim(),
          stderr:   stderr.trim(),
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

  const id       = uuidv4();
  const tmpDir   = '/tmp/kodechirp';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const srcPath  = path.join(tmpDir, `kc_${id}.${config.extension}`);
  const binPath  = path.join(tmpDir, `kc_${id}`);         // used only for C++

  try {
    fs.writeFileSync(srcPath, code, 'utf8');

    // ── C/C++: compile first ────────────────────────────────────────────────────
    if (language === 'cpp' || language === 'c') {
      const { command: cc, args: cargs } = config.compile(srcPath, binPath, tmpDir);
      const compileResult = await runProcess(cc, cargs, '', 15_000);   // 15s compile budget
      if (compileResult.exitCode !== 0 || compileResult.timedOut) {
        return {
          stdout:   '',
          stderr:   compileResult.stderr || 'Compilation failed',
          exitCode: compileResult.exitCode,
          timedOut: compileResult.timedOut,
          compilationError: true,
        };
      }
      // Run the compiled binary
      const { command: run, args: rargs } = config.run(binPath, tmpDir);
      return await runProcess(run, rargs, stdin, 5_000);
    }

    // ── Interpreted (JS / Python) ─────────────────────────────────────────────
    const { command, args } = config.run(srcPath, tmpDir);
    return await runProcess(command, args, stdin, 5_000);

  } finally {
    // Always clean up temp files — never leave user code on disk
    try { fs.unlinkSync(srcPath); } catch (_) { /* ignore */ }
    try { fs.unlinkSync(binPath); } catch (_) { /* ignore */ }
  }
};
