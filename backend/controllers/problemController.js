const problemService = require('../services/problemService');

exports.getAllProblems = async (req, res, next) => {
  try {
    const { search } = req.query;
    const problems = await problemService.getAllProblems(search);
    res.json({
      success: true,
      data: problems,
      meta: {
        total: problems.length
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getProblem = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const problem = await problemService.getProblemDetails(slug);
    
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: 'Problem not found'
      });
    }
    
    res.json({
      success: true,
      data: problem
    });
  } catch (err) {
    next(err);
  }
};
