const test = require('node:test');
const assert = require('node:assert/strict');

test('analytics overview calculates readiness with evaluated and failed-only sessions', async () => {
  const sessions = [
    { company: 'Acme', completedAt: new Date(), questions: [{ id: 1, topic: 'arrays', difficulty: 'medium' }], answers: [{ questionId: 1, score: 80, evaluationStatus: 'success', isLatest: true }] },
    { company: 'Acme', completedAt: new Date(), questions: [{ id: 1, topic: 'strings', difficulty: 'easy' }], answers: [{ questionId: 1, score: 90, evaluationStatus: 'success', isLatest: true }] },
    { company: 'Acme', completedAt: new Date(), questions: [{ id: 1, topic: 'arrays', difficulty: 'medium' }], answers: [{ questionId: 1, score: null, evaluationStatus: 'failed', isLatest: true }] }
  ];
  const chain = value => ({ select: () => ({ lean: async () => value }) });
  const sessionModel = require('../models/Session');
  const userModel = require('../models/User');
  const originalFind = sessionModel.find;
  const originalFindById = userModel.findById;
  sessionModel.find = () => chain(sessions);
  userModel.findById = () => chain({ targetCompanies: ['Acme'] });
  try {
    const { getOverview } = require('../controllers/analyticsController');
    let status;
    let body;
    await getOverview({ user: { userId: 'u1' }, query: {} }, { status(value) { status = value; return this; }, json(value) { body = value; } }, error => { throw error; });
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(typeof body.data.readinessScore, 'number');
    assert.equal(body.data.evaluatedSessionCount, 2);
  } finally {
    sessionModel.find = originalFind;
    userModel.findById = originalFindById;
  }
});
