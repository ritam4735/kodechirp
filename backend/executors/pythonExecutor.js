const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = '/tmp/kodechirp/';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const executePython = (code, input = '') => {
  return new Promise((resolve, reject) => {
    const filename = `${uuidv4()}.py`;
    const filePath = path.join(TEMP_DIR, filename);

    try {
      // Write code to a temporary file
      fs.writeFileSync(filePath, code);

      // Spawn the python process
      const process = spawn('python3', [filePath]);

      let stdout = '';
      let stderr = '';

      // Capture stdout
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Feed input to stdin if provided
      if (input) {
        process.stdin.write(input);
        process.stdin.end();
      }

      // Timeout protection (5 seconds)
      const timeout = setTimeout(() => {
        process.kill('SIGKILL'); // Kill process if timeout exceeded
        resolve({
          success: false,
          error: 'Execution Timed Out (Exceeded 5 seconds)',
          stdout: stdout,
          stderr: stderr
        });
      }, 5000);

      // Handle process completion
      process.on('close', (code) => {
        clearTimeout(timeout);
        // Clean up temp file
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
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

      // Handle process errors (e.g., python not installed)
      process.on('error', (err) => {
        clearTimeout(timeout);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
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
      // Clean up on initial error
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupErr) {
        // ignore
      }
      resolve({
        success: false,
        error: `Error setting up execution: ${err.message}`,
        stdout: '',
        stderr: ''
      });
    }
  });
};

module.exports = { executePython };
