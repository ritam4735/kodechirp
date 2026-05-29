const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = '/tmp/kodechirp/';

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const executeCpp = (code, input = '') => {
  return new Promise((resolve, reject) => {
    const jobId = uuidv4();
    const sourceFile = path.join(TEMP_DIR, `${jobId}.cpp`);
    const outFile = path.join(TEMP_DIR, `${jobId}.out`);

    try {
      fs.writeFileSync(sourceFile, code);

      // Compile the C++ code
      const compileProcess = spawn('g++', [sourceFile, '-o', outFile]);
      
      let compileStderr = '';
      compileProcess.stderr.on('data', (data) => {
        compileStderr += data.toString();
      });

      compileProcess.on('close', (code) => {
        if (code !== 0) {
          // Compilation failed
          try {
            if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
          } catch (e) {}
          return resolve({
            success: false,
            error: compileStderr || 'Compilation failed',
            stdout: '',
            stderr: compileStderr
          });
        }

        // Execution phase
        const runProcess = spawn(outFile);
        let stdout = '';
        let stderr = '';

        runProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        runProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        if (input) {
          runProcess.stdin.write(input);
          runProcess.stdin.end();
        }

        const timeout = setTimeout(() => {
          runProcess.kill('SIGKILL');
          resolve({
            success: false,
            error: 'Execution Timed Out (Exceeded 5 seconds)',
            stdout: stdout,
            stderr: stderr
          });
        }, 5000);

        runProcess.on('close', (runCode) => {
          clearTimeout(timeout);
          // Cleanup files
          try {
            if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
            if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
          } catch (e) {}

          if (runCode !== 0 && runCode !== null) {
            resolve({
              success: false,
              error: stderr || 'Execution failed',
              stdout: stdout,
              stderr: stderr
            });
          } else {
            resolve({
              success: true,
              stdout: stdout,
              stderr: stderr
            });
          }
        });

        runProcess.on('error', (err) => {
          clearTimeout(timeout);
          try {
            if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
            if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
          } catch (e) {}
          resolve({
            success: false,
            error: `Failed to start process: ${err.message}`,
            stdout: stdout,
            stderr: stderr
          });
        });
      });

      compileProcess.on('error', (err) => {
        try {
          if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        } catch (e) {}
        resolve({
          success: false,
          error: `Compiler error: ${err.message}`,
          stdout: '',
          stderr: ''
        });
      });

    } catch (err) {
      try {
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
      } catch (e) {}
      resolve({
        success: false,
        error: `Error setting up execution: ${err.message}`,
        stdout: '',
        stderr: ''
      });
    }
  });
};

module.exports = { executeCpp };
