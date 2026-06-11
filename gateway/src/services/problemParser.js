// gateway/src/services/problemParser.js
// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Problem Parser — No AI Dependencies
// Parses raw LeetCode-style problem text into structured ParsedProblem format.
// Fault-tolerant: always returns a valid ParseResult, never throws.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ParsedExample
 * @property {string} input
 * @property {string} output
 * @property {string} [explanation]
 */

/**
 * @typedef {Object} ParsedProblem
 * @property {string} description
 * @property {ParsedExample[]} examples
 * @property {string[]} constraints
 * @property {string[]} notes
 */

/**
 * @typedef {Object} ParseResult
 * @property {ParsedProblem} parsed
 * @property {number} confidence - 0.0 to 1.0
 */

// ── Section Header Patterns ─────────────────────────────────────────────────

// Match "Example 1:", "Example 2:", "Example:", etc.
const EXAMPLE_HEADER_RE = /^(?:example)\s*(\d+)?\s*:?\s*$/i;
const INLINE_EXAMPLE_HEADER_RE = /^((?:example)\s*(?:\d+)?):\s*(.+)$/i;

// Match "Constraints:", "Constraint:"
const CONSTRAINT_HEADER_RE = /^(?:constraints?)\s*:?\s*$/i;
const INLINE_CONSTRAINT_HEADER_RE = /^((?:constraints?)):\s*(.+)$/i;

// Match "Note:", "Notes:", "Follow Up:", "Follow-up:", "Followup:"
const NOTES_HEADER_RE = /^(?:notes?|follow[\s-]?up)\s*:?\s*$/i;
const INLINE_NOTES_HEADER_RE = /^((?:notes?|follow[\s-]?up)):\s*(.+)$/i;

// Match "Input:", "INPUT:", "Input", etc.
const INPUT_RE = /^(?:input)\s*:?\s*/i;

// Match "Output:", "OUTPUT:", "Output", etc.
const OUTPUT_RE = /^(?:output)\s*:?\s*/i;

// Match "Explanation:", "EXPLANATION:", etc.
const EXPLANATION_RE = /^(?:explanation)\s*:?\s*/i;

// ── Helper: Classify a line ─────────────────────────────────────────────────

const SECTION_TYPES = {
  EXAMPLE: 'EXAMPLE',
  CONSTRAINT: 'CONSTRAINT',
  NOTE: 'NOTE',
  CONTENT: 'CONTENT',
};

/**
 * Determines if a line is a section header.
 * Returns { type, index? } or null.
 */
function classifyLine(line) {
  const trimmed = line.trim();

  if (EXAMPLE_HEADER_RE.test(trimmed)) {
    const match = trimmed.match(EXAMPLE_HEADER_RE);
    return { type: SECTION_TYPES.EXAMPLE, index: match[1] ? parseInt(match[1]) : null };
  }

  if (CONSTRAINT_HEADER_RE.test(trimmed)) {
    return { type: SECTION_TYPES.CONSTRAINT };
  }

  if (NOTES_HEADER_RE.test(trimmed)) {
    return { type: SECTION_TYPES.NOTE };
  }

  return null;
}

function normalizeLines(rawText) {
  const normalized = [];
  const lines = rawText.replace(/\r\n?/g, '\n').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    const inlineExample = trimmed.match(INLINE_EXAMPLE_HEADER_RE);
    const inlineConstraint = trimmed.match(INLINE_CONSTRAINT_HEADER_RE);
    const inlineNote = trimmed.match(INLINE_NOTES_HEADER_RE);

    if (inlineExample) {
      normalized.push(`${inlineExample[1]}:`);
      normalized.push(inlineExample[2]);
      continue;
    }

    if (inlineConstraint) {
      normalized.push(`${inlineConstraint[1]}:`);
      normalized.push(inlineConstraint[2]);
      continue;
    }

    if (inlineNote) {
      normalized.push(`${inlineNote[1]}:`);
      normalized.push(inlineNote[2]);
      continue;
    }

    normalized.push(line);
  }

  return normalized;
}

// ── Extract Examples from a block of lines ──────────────────────────────────

/**
 * Parses an example block into { input, output, explanation }.
 * Handles multi-line values and missing fields.
 */
function parseExampleBlock(lines) {
  let input = '';
  let output = '';
  let explanation = '';
  let currentField = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this line starts a field
    if (INPUT_RE.test(trimmed)) {
      currentField = 'input';
      const value = trimmed.replace(INPUT_RE, '').trim();
      if (value) input = value;
      continue;
    }

    if (OUTPUT_RE.test(trimmed)) {
      currentField = 'output';
      const value = trimmed.replace(OUTPUT_RE, '').trim();
      if (value) output = value;
      continue;
    }

    if (EXPLANATION_RE.test(trimmed)) {
      currentField = 'explanation';
      const value = trimmed.replace(EXPLANATION_RE, '').trim();
      if (value) explanation = value;
      continue;
    }

    // Continuation of current field
    if (currentField === 'input') {
      input += (input ? '\n' : '') + trimmed;
    } else if (currentField === 'output') {
      output += (output ? '\n' : '') + trimmed;
    } else if (currentField === 'explanation') {
      explanation += (explanation ? '\n' : '') + trimmed;
    }
  }

  const example = { input: input.trim(), output: output.trim() };
  if (explanation.trim()) {
    example.explanation = explanation.trim();
  }
  return example;
}

// ── Extract Constraint Lines ────────────────────────────────────────────────

/**
 * Parses constraint lines. Splits on newlines and bullet patterns.
 */
function parseConstraintLines(lines) {
  const constraints = [];

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Remove leading bullet markers without stripping negative numbers.
    trimmed = trimmed.replace(/^[-•*·]\s+/, '');

    if (trimmed) {
      constraints.push(trimmed);
    }
  }

  return constraints;
}

// ── Main Parser ─────────────────────────────────────────────────────────────

/**
 * Parses raw problem text into a structured ParsedProblem.
 *
 * @param {string} rawText - The raw problem statement text
 * @returns {ParseResult} - The parsed result with confidence score
 */
function parseProblem(rawText) {
  // Default empty result
  const defaultResult = {
    parsed: {
      description: '',
      examples: [],
      constraints: [],
      notes: [],
    },
    confidence: 0.0,
  };

  if (!rawText || typeof rawText !== 'string') {
    return defaultResult;
  }

  const lines = normalizeLines(rawText);

  // ── Phase 1: Identify section boundaries ────────────────────────────────

  // Each section: { type, startLine, endLine, index? }
  const sections = [];
  let descriptionEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const classification = classifyLine(lines[i]);
    if (classification) {
      if (sections.length === 0 && i > 0) {
        descriptionEnd = i;
      }
      sections.push({
        ...classification,
        startLine: i,
        endLine: lines.length, // will be updated
      });
    }
  }

  // Update end lines for each section
  for (let i = 0; i < sections.length - 1; i++) {
    sections[i].endLine = sections[i + 1].startLine;
  }

  // If we found sections, description ends at first section
  if (sections.length > 0) {
    descriptionEnd = sections[0].startLine;
  }

  // ── Phase 2: Extract description ────────────────────────────────────────

  const descriptionLines = lines.slice(0, descriptionEnd);
  const description = descriptionLines
    .join('\n')
    .trim()
    // Clean up excessive whitespace but preserve paragraphs
    .replace(/\n{3,}/g, '\n\n');

  // ── Phase 3: Extract examples ───────────────────────────────────────────

  const examples = [];
  const exampleSections = sections.filter(s => s.type === SECTION_TYPES.EXAMPLE);

  for (const section of exampleSections) {
    const blockLines = lines.slice(section.startLine + 1, section.endLine);
    const example = parseExampleBlock(blockLines);

    // Only include if we got at least an input or output
    if (example.input || example.output) {
      examples.push(example);
    }
  }

  // ── Phase 4: Extract constraints ────────────────────────────────────────

  let constraints = [];
  const constraintSections = sections.filter(s => s.type === SECTION_TYPES.CONSTRAINT);

  for (const section of constraintSections) {
    const blockLines = lines.slice(section.startLine + 1, section.endLine);
    constraints = constraints.concat(parseConstraintLines(blockLines));
  }

  // ── Phase 5: Extract notes ──────────────────────────────────────────────

  let notes = [];
  const noteSections = sections.filter(s => s.type === SECTION_TYPES.NOTE);

  for (const section of noteSections) {
    const blockLines = lines.slice(section.startLine + 1, section.endLine);
    const noteLines = blockLines
      .map(l => l.trim())
      .filter(l => l);
    notes = notes.concat(noteLines);
  }

  // ── Phase 6: Calculate confidence ───────────────────────────────────────

  const confidence = calculateConfidence({
    description,
    examples,
    constraints,
    notes,
    rawLength: rawText.length,
  });

  return {
    parsed: {
      description,
      examples,
      constraints,
      notes,
    },
    confidence,
  };
}

// ── Confidence Scoring ──────────────────────────────────────────────────────

/**
 * Calculates parser confidence based on what was extracted.
 *
 * Scoring rubric:
 * - Description found & non-trivial (+0.30)
 * - At least 1 example found (+0.25)
 * - At least 2 examples found (+0.10)
 * - Constraints found (+0.20)
 * - All examples have input AND output (+0.10)
 * - Description is substantial (> 50 chars) (+0.05)
 */
function calculateConfidence({ description, examples, constraints, notes, rawLength }) {
  let score = 0;

  // Description presence and quality
  if (description && description.trim().length > 0) {
    score += 0.30;

    // Substantial description bonus
    if (description.trim().length > 50) {
      score += 0.05;
    }
  }

  // Example extraction
  if (examples.length > 0) {
    score += 0.25;

    // Multiple examples bonus
    if (examples.length >= 2) {
      score += 0.10;
    }

    // All examples well-formed (have both input and output)
    const allWellFormed = examples.every(e => e.input && e.output);
    if (allWellFormed) {
      score += 0.10;
    }
  }

  // Constraints presence
  if (constraints.length > 0) {
    score += 0.20;
  }

  // Clamp to [0.0, 1.0]
  return Math.min(1.0, Math.round(score * 100) / 100);
}

// ── Batch Parser ────────────────────────────────────────────────────────────

/**
 * Parse multiple problems in batch.
 * @param {Array<{id: string, description: string}>} problems
 * @returns {Array<{id: string, result: ParseResult}>}
 */
function parseBatch(problems) {
  return problems.map(problem => ({
    id: problem.id,
    result: parseProblem(problem.description || problem.raw_statement || ''),
  }));
}

module.exports = {
  parseProblem,
  parseBatch,
  calculateConfidence,
  // Export internals for testing
  _internals: {
    classifyLine,
    parseExampleBlock,
    parseConstraintLines,
    normalizeLines,
  },
};
