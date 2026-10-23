const test = require('node:test');
const assert = require('node:assert/strict');
const { failedSessionsFilter } = require('../controllers/sessionController');

test('failed-session filter requires non-empty answers all marked failed', () => {
  const filter = failedSessionsFilter('owner-id');
  assert.equal(filter.userId, 'owner-id');
  assert.deepEqual(filter.answers, { $exists: true, $ne: [] });
  const allFailed = [{ evaluationStatus: 'failed' }, { evaluationStatus: 'failed' }];
  const mixed = [{ evaluationStatus: 'success', score: 80 }, { evaluationStatus: 'failed' }];
  const zeroScore = [{ evaluationStatus: 'success', score: 0 }];
  const empty = [];
  const matches = answers => answers.length > 0 && answers.every(answer => answer.evaluationStatus === 'failed');
  assert.equal(matches(allFailed), true, 'all-failed session is selected');
  assert.equal(matches(mixed), false, 'mixed session is preserved');
  assert.equal(matches(zeroScore), false, 'legitimate score zero is preserved');
  assert.equal(matches(empty), false, 'empty session is left to the empty-session route');
});
