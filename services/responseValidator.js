/**
 * Parses and sanitizes Gemini's raw question response.
 *
 * NOTE: `requested` reflects the number of items that survived JSON.parse —
 * NOT the `count` originally requested from Gemini. If Gemini itself
 * underdelivers (e.g. asked for 5, returned 3), that gap is invisible here.
 * Tracking the true requested/generated/delivered pipeline is deferred —
 * thread `count` through as a param if/when that distinction matters.
 */

const { TOPICS, VERDICTS } = require('../config/constants');

function validateQuestions(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error('Failed to parse Gemini response as JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Expected an array of questions');
  }

  
  const requiredFields = ['id', 'question', 'topic', 'difficulty', 'expectedKeyPoints'];

  const valid = parsed.filter(item => {
    const hasAllFields = requiredFields.every(field => item[field] !== undefined);
    const keyPointsIsArray = Array.isArray(item.expectedKeyPoints);
    const topicIsAllowed = TOPICS.includes(item.topic);
    const idIsNumber = typeof item.id === 'number';

    return hasAllFields && keyPointsIsArray && topicIsAllowed && idIsNumber;
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