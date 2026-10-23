const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTargetCompanies } = require('../controllers/authController');

test('targetCompanies allows at most ten strings of at most 60 trimmed characters', () => {
  assert.equal(validateTargetCompanies(['  Acme  ', 'x'.repeat(60)]), true);
  assert.equal(validateTargetCompanies([]), true);
  assert.equal(validateTargetCompanies('Acme'), false);
  assert.equal(validateTargetCompanies(Array(11).fill('Acme')), false);
  assert.equal(validateTargetCompanies(['x'.repeat(61)]), false);
  assert.equal(validateTargetCompanies(['Acme', 42]), false);
});
