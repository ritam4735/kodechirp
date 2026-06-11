// gateway/src/services/problemNormalizationService.js
// ─────────────────────────────────────────────────────────────────────────────
// AI-Assisted Problem Normalization Service
// Refines parser output using LLM for formatting cleanup, example
// normalization, constraint inference, and quality assessment.
// Falls back gracefully if AI is unavailable — parser result is still usable.
// ─────────────────────────────────────────────────────────────────────────────

const logger = require('../utils/logger');

// ── Configuration ───────────────────────────────────────────────────────────

const AI_CONFIG = {
  apiUrl: process.env.AI_API_URL || '',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'gpt-4o-mini',
  maxTokens: 4096,
  temperature: 0.2,
};

function isAIConfigured() {
  return !!(AI_CONFIG.apiUrl && AI_CONFIG.apiKey);
}

// ── AI Request Helper ───────────────────────────────────────────────────────

async function callAI(systemPrompt, userPrompt) {
  if (!isAIConfigured()) {
    throw new Error('AI service is not configured. Set AI_API_URL and AI_API_KEY in environment.');
  }

  const fetch = require('node-fetch');

  const response = await fetch(AI_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      response_format: { type: 'json_object' },
    }),
    timeout: 30000,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned empty response');
  }

  return JSON.parse(content);
}

// ── Normalization System Prompt ─────────────────────────────────────────────

const NORMALIZATION_PROMPT = `You are a competitive programming problem editor. Your task is to normalize and clean up problem content.

You will receive a parsed problem with these fields:
- description: the problem statement
- examples: array of {input, output, explanation}
- constraints: array of constraint strings
- notes: array of notes

Your job:
1. FORMATTING CLEANUP:
   - Convert the description to clean Markdown
   - Preserve lists, paragraphs, code blocks, and mathematical notation
   - Remove unnecessary whitespace or formatting artifacts
   - Do NOT change the problem's meaning

2. EXAMPLE NORMALIZATION:
   - Ensure each example has properly formatted input and output
   - Clean up any formatting issues in input/output values
   - Preserve explanations

3. CONSTRAINT INFERENCE:
   - If constraints array is empty, infer likely constraints from the problem
   - Mark inferred constraints as ai_generated
   - Common patterns: array lengths, value ranges, string lengths

4. QUALITY FLAGS:
   - Set missing_constraints: true if no constraints were found AND you couldn't infer any
   - Set malformed_examples: true if examples have structural issues
   - Set suspicious_formatting: true if the description has significant formatting problems
   - Set needs_manual_review: true if you have low confidence in your output

Return a JSON object with this exact structure:
{
  "description": "cleaned markdown description",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": ["constraint1", "constraint2"],
  "notes": ["note1"],
  "generated_constraints": ["inferred constraint1"],
  "quality_flags": {
    "missing_constraints": false,
    "malformed_examples": false,
    "suspicious_formatting": false,
    "needs_manual_review": false
  }
}`;

// ── Normalize a Single Problem ──────────────────────────────────────────────

/**
 * Normalize a parsed problem using AI assistance.
 *
 * @param {Object} parsedProblem - Output from problemParser.parseProblem().parsed
 * @param {string} rawText - Original raw text for context
 * @returns {Object} - Normalized result with quality flags
 */
async function normalize(parsedProblem, rawText) {
  if (!isAIConfigured()) {
    logger.warn('[Normalization] AI not configured, returning parser output with default flags');
    return {
      ...parsedProblem,
      generated_constraints: [],
      constraint_source: 'parsed',
      quality_flags: {
        missing_constraints: parsedProblem.constraints.length === 0,
        malformed_examples: parsedProblem.examples.some(e => !e.input || !e.output),
        suspicious_formatting: false,
        needs_manual_review: parsedProblem.constraints.length === 0 ||
          parsedProblem.examples.length === 0,
      },
    };
  }

  try {
    const userPrompt = `Here is the parsed problem data:

${JSON.stringify(parsedProblem, null, 2)}

Original raw text for context:
---
${rawText}
---

Please normalize this problem.`;

    const aiResult = await callAI(NORMALIZATION_PROMPT, userPrompt);

    // Validate AI response structure
    const normalized = {
      description: aiResult.description || parsedProblem.description,
      examples: Array.isArray(aiResult.examples) ? aiResult.examples : parsedProblem.examples,
      constraints: Array.isArray(aiResult.constraints) ? aiResult.constraints : parsedProblem.constraints,
      notes: Array.isArray(aiResult.notes) ? aiResult.notes : parsedProblem.notes,
      generated_constraints: Array.isArray(aiResult.generated_constraints)
        ? aiResult.generated_constraints
        : [],
      constraint_source: (aiResult.generated_constraints && aiResult.generated_constraints.length > 0)
        ? 'ai_generated'
        : 'parsed',
      quality_flags: {
        missing_constraints: aiResult.quality_flags?.missing_constraints ?? false,
        malformed_examples: aiResult.quality_flags?.malformed_examples ?? false,
        suspicious_formatting: aiResult.quality_flags?.suspicious_formatting ?? false,
        needs_manual_review: aiResult.quality_flags?.needs_manual_review ?? false,
      },
    };

    return normalized;
  } catch (err) {
    logger.error({ err }, '[Normalization] AI normalization failed, returning parser output');

    // Graceful fallback: return parser result with basic flags
    return {
      ...parsedProblem,
      generated_constraints: [],
      constraint_source: 'parsed',
      quality_flags: {
        missing_constraints: parsedProblem.constraints.length === 0,
        malformed_examples: parsedProblem.examples.some(e => !e.input || !e.output),
        suspicious_formatting: false,
        needs_manual_review: true, // Flag for review since AI failed
      },
    };
  }
}

// ── Check AI Status ─────────────────────────────────────────────────────────

function getAIStatus() {
  return {
    configured: isAIConfigured(),
    apiUrl: AI_CONFIG.apiUrl ? '***configured***' : 'not set',
    model: AI_CONFIG.model,
  };
}

module.exports = {
  normalize,
  isAIConfigured,
  getAIStatus,
};
