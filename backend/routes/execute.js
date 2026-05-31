const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../utils/validate');
const { runCode } = require('../services/codeRunner');

router.post('/', 
  body('code').isString().notEmpty().withMessage('Code is required'),
  body('language').isString().notEmpty().withMessage('Language is required'),
  body('input').optional().isString(),
  validateRequest,
  async (req, res) => {
  const { code, language, input } = req.body;

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
