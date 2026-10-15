const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreMcq } = require('../services/mcqScoring');

const question = { correctOptionIndex: 2, explanation: 'A hash map gives constant average lookup.' };

test('MCQ scoring returns feedback for a correct answer', () => {
  const result = scoreMcq(question, 2);
  assert.equal(result.score, 100);
  assert.equal(result.verdict, 'good');
  assert.equal(result.explanation, question.explanation);
});

test('MCQ scoring returns a zero score and missed point for a wrong answer', () => {
  const result = scoreMcq(question, 1);
  assert.equal(result.score, 0);
  assert.equal(result.verdict, 'poor');
  assert.equal(result.missedPoints.length, 1);
});
