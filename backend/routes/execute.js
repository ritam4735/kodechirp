const express = require('express');
const router = express.Router();
const { runCode } = require('../services/codeRunner');

router.post('/', async (req, res) => {
  const { code, language, input } = req.body;

  if (!code || !language) {
    return res.status(400).json({ success: false, error: 'Code and language are required' });
  }

  // Normalize language for codeRunner
  let normalizedLang = language.toLowerCase();
  if (['python', 'python3', 'py'].includes(normalizedLang)) normalizedLang = 'python';
  else if (['c'].includes(normalizedLang)) normalizedLang = 'c';
  else if (['cpp', 'c++'].includes(normalizedLang)) normalizedLang = 'cpp';
  else if (['js', 'javascript', 'node'].includes(normalizedLang)) normalizedLang = 'javascript';
  else return res.status(400).json({ success: false, error: `Language '${language}' is not supported` });

  try {
    const result = await runCode(code, normalizedLang, input || '');
    
    res.json({
      success: result.exitCode === 0 && !result.timedOut && !result.compilationError,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.timedOut ? 'Execution Timed Out (Exceeded 5 seconds)' : 
             (result.exitCode !== 0 ? result.stderr || 'Execution failed' : null)
    });
  } catch (err) {
    console.error('Execution error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during execution' });
  }
});

module.exports = router;
