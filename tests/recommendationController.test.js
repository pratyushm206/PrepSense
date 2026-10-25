const test = require('node:test');
const assert = require('node:assert/strict');

const Session = require('../models/Session');
const User = require('../models/User');
const { getRecommendations } = require('../controllers/recommendationController');

function chain(value) {
  return { select() { return this; }, lean: async () => value };
}

async function callRecommendations({ targetCompanies, sessions, companyTopics }) {
  const originals = {
    find: Session.find,
    aggregate: Session.aggregate,
    findById: User.findById
  };
  Session.find = () => chain(sessions);
  Session.aggregate = async () => companyTopics;
  User.findById = () => chain(targetCompanies === null ? null : { targetCompanies });

  try {
    let status;
    let body;
    await getRecommendations(
      { user: { userId: 'user-1' }, query: {} },
      { status(value) { status = value; return this; }, json(value) { body = value; } },
      error => { throw error; }
    );
    assert.equal(status, 200);
    assert.equal(body.success, true);
    return body.data;
  } finally {
    Session.find = originals.find;
    Session.aggregate = originals.aggregate;
    User.findById = originals.findById;
  }
}

function weakSession() {
  return {
    questions: [{ id: 1, topic: 'arrays', difficulty: 'medium' }],
    answers: [{ questionId: 1, score: 30, evaluationStatus: 'success', isLatest: true }]
  };
}

function assertArrayFields(data) {
  assert.ok(Array.isArray(data.weakTopics));
  assert.ok(Array.isArray(data.companyFocusTopics));
  assert.ok(Array.isArray(data.recommendations));
}

test('recommendations return consistent arrays for a user without targets or sessions', async () => {
  const data = await callRecommendations({ targetCompanies: [], sessions: [], companyTopics: [] });

  assert.equal(data.targetCompany, null);
  assertArrayFields(data);
  assert.deepEqual(data.weakTopics, []);
  assert.deepEqual(data.companyFocusTopics, []);
  assert.deepEqual(data.recommendations, []);
});

test('recommendations return personal topics for sessions without a target company', async () => {
  const data = await callRecommendations({ targetCompanies: [], sessions: [weakSession()], companyTopics: [] });

  assert.equal(data.targetCompany, null);
  assertArrayFields(data);
  assert.equal(data.weakTopics[0].topic, 'arrays');
  assert.equal(data.recommendations[0].topic, 'arrays');
  assert.deepEqual(data.companyFocusTopics, []);
});

test('recommendations return empty company focus when a target has no matching company data', async () => {
  const data = await callRecommendations({ targetCompanies: ['Acme'], sessions: [], companyTopics: [] });

  assert.equal(data.targetCompany, 'Acme');
  assertArrayFields(data);
  assert.deepEqual(data.companyFocusTopics, []);
  assert.deepEqual(data.recommendations, []);
});

test('recommendations preserve every company topic as an array for a normal user', async () => {
  const data = await callRecommendations({
    targetCompanies: ['Acme'],
    sessions: [weakSession()],
    companyTopics: [{ topic: 'arrays', count: 3 }, { topic: 'graphs', count: 1 }]
  });

  assert.equal(data.targetCompany, 'Acme');
  assertArrayFields(data);
  assert.deepEqual(data.companyFocusTopics, [
    { topic: 'arrays', count: 3 },
    { topic: 'graphs', count: 1 }
  ]);
  assert.equal(data.recommendations[0].priority, 'high');
});
