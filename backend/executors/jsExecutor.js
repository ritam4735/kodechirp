const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = '/tmp/kodechirp/';

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const executeJs = (code, input = '') => {
  return new Promise((resolve, reject) => {
    const filename = `${uuidv4()}.js`;
    const filePath = path.join(TEMP_DIR, filename);

    try {
      fs.writeFileSync(filePath, code);

      const process = spawn('node', [filePath]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      if (input) {
        process.stdin.write(input);
        process.stdin.end();
      }

      const timeout = setTimeout(() => {
        process.kill('SIGKILL');
        resolve({
          success: false,
          error: 'Execution Timed Out (Exceeded 5 seconds)',
          stdout: stdout,
          stderr: stderr
        });
      }, 5000);

      process.on('close', (code) => {
        clearTimeout(timeout);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.error(`Error cleaning up file ${filePath}:`, cleanupErr);
        }

        if (code !== 0 && code !== null) {
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

      process.on('error', (err) => {
        clearTimeout(timeout);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.error(`Error cleaning up file ${filePath}:`, cleanupErr);
        }
        resolve({
          success: false,
          error: `Failed to start process: ${err.message}`,
          stdout: stdout,
          stderr: stderr
        });
      });

    } catch (err) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (cleanupErr) {}
      resolve({
        success: false,
        error: `Error setting up execution: ${err.message}`,
        stdout: '',
        stderr: ''
      });
    }
  });
};

module.exports = { executeJs };
