const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnv } = require('../config/validateEnv');

const valid = () => ({
  NODE_ENV: 'production', MONGO_URI: 'mongodb://example/db', JWT_SECRET: 'x'.repeat(32),
  CLIENT_URL: 'https://example.test', GEMINI_API_KEY: 'dummy'
});

test('production environment accepts all required values', () => {
  assert.equal(validateEnv(valid(), { warn() {} }), true);
});

test('production environment rejects a short JWT secret without exposing it', () => {
  const env = { ...valid(), JWT_SECRET: 'do-not-print-this' };
  assert.throws(() => validateEnv(env), error => error.message.includes('JWT_SECRET must be at least 32 characters') && !error.message.includes(env.JWT_SECRET));
});

for (const name of ['JWT_SECRET', 'MONGO_URI', 'CLIENT_URL', 'GEMINI_API_KEY']) {
  test(`production environment rejects missing ${name} without exposing values`, () => {
    const env = { ...valid(), [name]: '' };
    assert.throws(() => validateEnv(env), error => error.message.includes(`Missing required environment variable: ${name}`) && !error.message.includes('mongodb://'));
  });
}

test('development mode warns instead of throwing for invalid environment', () => {
  const warnings = [];
  const result = validateEnv({ NODE_ENV: 'development', JWT_SECRET: 'short' }, { warn: message => warnings.push(message) });
  assert.equal(result, false);
  assert.equal(warnings.length, 4);
  assert.ok(warnings.every(message => !message.includes('mongodb://')));
});
