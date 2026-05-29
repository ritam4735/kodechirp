const Problem = require('../models/Problem');
const { getShortDescription } = require('../utils/formatter');

exports.getAllProblems = async (searchQuery) => {
  const problems = await Problem.findAll(searchQuery);
  
  return problems.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    short_description: getShortDescription(p.description),
    created_at: p.created_at
  }));
};

exports.getProblemDetails = async (slug) => {
  return await Problem.findBySlug(slug);
};
