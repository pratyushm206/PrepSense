/**
 * Parses and sanitizes Gemini's raw question response.
 *
 * NOTE: `requested` reflects the number of items that survived JSON.parse —
 * NOT the `count` originally requested from Gemini. If Gemini itself
 * underdelivers (e.g. asked for 5, returned 3), that gap is invisible here.
 * Tracking the true requested/generated/delivered pipeline is deferred —
 * thread `count` through as a param if/when that distinction matters.
 */

const { VERDICTS, CATEGORIES } = require('../config/constants');

function validateQuestions(rawText, category) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error('Failed to parse Gemini response as JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Expected an array of questions');
  }

  const categoryConfig = CATEGORIES[category];
  if (!categoryConfig) {
    throw new Error(`Invalid category: "${category}". Must be one of: ${Object.keys(CATEGORIES).join(', ')}`);
  }
  const allowedTopics = categoryConfig.topics;

  const baseFields = ['id', 'question', 'topic', 'difficulty', 'expectedKeyPoints'];

  const validateDsaShape = item => {
    if (typeof item.problemStatement !== 'string' || !item.problemStatement.trim()) return false;

    if (!Array.isArray(item.examples) || item.examples.length === 0) return false;
    const expectedExampleCount = item.difficulty === 'easy' ? 1 : 2;
    if (item.examples.length !== expectedExampleCount) return false;
    const examplesValid = item.examples.every(ex =>
      typeof ex.input === 'string' && ex.input.trim() &&
      typeof ex.output === 'string' && ex.output.trim() &&
      typeof ex.explanation === 'string'
    );
    if (!examplesValid) return false;

    if (!Array.isArray(item.glossary)) return false;
    const glossaryValid = item.glossary.every(g =>
      typeof g.term === 'string' && g.term.trim() &&
      typeof g.meaning === 'string' && g.meaning.trim()
    );
    if (!glossaryValid) return false;

    if (typeof item.inputFormat !== 'string' || !item.inputFormat.trim()) return false;
    if (typeof item.outputFormat !== 'string' || !item.outputFormat.trim()) return false;

    if (!Array.isArray(item.constraints) || item.constraints.length === 0) return false;

    return true;
  };

  const valid = parsed.filter(item => {
    const hasBaseFields = baseFields.every(field => item[field] !== undefined);
    const keyPointsIsArray = Array.isArray(item.expectedKeyPoints);
    const topicIsAllowed = allowedTopics.includes(item.topic);
    const idIsNumber = typeof item.id === 'number';

    if (!hasBaseFields || !keyPointsIsArray || !topicIsAllowed || !idIsNumber) return false;

    if (category === 'dsa') return validateDsaShape(item);

    return true;
  });

  if (valid.length < parsed.length) {
    console.warn(`Validation: ${parsed.length - valid.length} malformed question(s) filtered out`);
  }

  return {
    questions: valid,
    requested: parsed.length,
    delivered: valid.length
  };
}

function validateEvaluation(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error('Failed to parse Gemini evaluation response as JSON');
  }

  const requiredFields = ['score', 'strengths', 'improvements', 'missedPoints', 'verdict'];
  const hasAllFields = requiredFields.every(field => parsed[field] !== undefined);

  if (!hasAllFields) {
    throw new Error('Gemini evaluation response missing required fields');
  }

  const scoreIsValid = typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 100;
  const arraysAreValid = ['strengths', 'improvements', 'missedPoints'].every(f => Array.isArray(parsed[f]));
  const verdictIsValid = VERDICTS.includes(parsed.verdict);

  if (!scoreIsValid || !arraysAreValid || !verdictIsValid) {
    throw new Error('Gemini evaluation response failed field validation');
  }

  return parsed;
}

module.exports = { validateQuestions, validateEvaluation };