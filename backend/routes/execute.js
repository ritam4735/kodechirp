const express = require('express');
const router = express.Router();

const { executePython } = require('../executors/pythonExecutor');
const { executeC } = require('../executors/cExecutor');
const { executeCpp } = require('../executors/cppExecutor');
const { executeJs } = require('../executors/jsExecutor');

router.post('/', async (req, res) => {
  const { code, language, input } = req.body;

  if (!code || !language) {
    return res.status(400).json({ success: false, error: 'Code and language are required' });
  }

  let result;
  try {
    switch (language.toLowerCase()) {
      case 'python':
      case 'python3':
      case 'py':
        result = await executePython(code, input);
        break;
      case 'c':
        result = await executeC(code, input);
        break;
      case 'cpp':
      case 'c++':
        result = await executeCpp(code, input);
        break;
      case 'js':
      case 'javascript':
      case 'node':
        result = await executeJs(code, input);
        break;
      default:
        return res.status(400).json({ success: false, error: `Language '${language}' is not supported` });
    }

    res.json(result);
  } catch (err) {
    console.error('Execution error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during execution' });
  }
});

module.exports = router;
