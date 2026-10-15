const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeScore, calculateSessionScore, detectTrend, hasLatestSuccessfulAnswer } = require('../services/scoringEngine');

test('difficulty normalization keeps the existing score rules', () => {
  assert.equal(normalizeScore(80, 'hard'), 100);
  assert.equal(normalizeScore(80, 'easy'), 64);
  assert.equal(normalizeScore(50, 'medium'), 50);
});

test('session score uses latest successful answers', () => {
  const session = {
    questions: [{ id: 1, difficulty: 'medium' }, { id: 2, difficulty: 'easy' }],
    answers: [
      { questionId: 1, score: 20, isLatest: false },
      { questionId: 1, score: 80, isLatest: true, evaluationStatus: 'success' },
      { questionId: 2, score: 90, isLatest: true, evaluationStatus: 'success' }
    ]
  };
  assert.equal(calculateSessionScore(session), 76);
});

test('dashboard history includes only sessions with a latest successful evaluation', () => {
  assert.equal(hasLatestSuccessfulAnswer({ answers: [{ questionId: 1, evaluationStatus: 'success', isLatest: true }] }), true);
  assert.equal(hasLatestSuccessfulAnswer({ answers: [{ questionId: 1, evaluationStatus: 'failed', isLatest: true }] }), false);
  assert.equal(hasLatestSuccessfulAnswer({ answers: [{ questionId: 1, evaluationStatus: 'success', isLatest: false }] }), false);
});

test('trend detection identifies direction and stability', () => {
  assert.equal(detectTrend([50, 55, 60, 70, 80]), 'improving');
  assert.equal(detectTrend([80, 70, 60, 55, 50]), 'declining');
  assert.equal(detectTrend([60, 61, 59, 60]), 'stable');
});
