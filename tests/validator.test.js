const test = require('node:test');
const assert = require('node:assert/strict');
const { validateQuestions } = require('../services/responseValidator');

test('validator accepts fenced JSON and reports requested versus delivered', () => {
  const raw = '```json\n' + JSON.stringify([
    { id: 1, question: 'What is a JOIN?', topic: 'DBMS', difficulty: 'medium', expectedKeyPoints: ['O(log n)'] }
  ]) + '\n```';
  const result = validateQuestions(raw, 'core', { requestedCount: 3 });
  assert.equal(result.requested, 3);
  assert.equal(result.delivered, 1);
});

test('validator normalizes partial DSA details and accepts one to three examples', () => {
  const raw = JSON.stringify([{
    id: 1,
    question: 'Reverse a linked list',
    problemStatement: 'Reverse the links.',
    examples: [{ input: '[1,2]', output: '[2,1]' }],
    topic: 'arrays',
    difficulty: 'medium',
    expectedKeyPoints: ['Reverse pointers']
  }]);
  const result = validateQuestions(raw, 'dsa');
  assert.equal(result.delivered, 1);
  assert.equal(result.questions[0].examples[0].explanation, '');
  assert.deepEqual(result.questions[0].glossary, []);
  assert.deepEqual(result.questions[0].constraints, []);
});

test('validator filters malformed entries and rejects invalid JSON', () => {
  const result = validateQuestions(JSON.stringify([null, {
    id: 1, question: 'What is a JOIN?', topic: 'DBMS', difficulty: 'easy', expectedKeyPoints: []
  }]), 'core');
  assert.equal(result.delivered, 1);
  assert.throws(() => validateQuestions('{bad', 'core'), /parse Gemini response/);
});
