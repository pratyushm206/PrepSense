const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../middleware/errorHandler');

test('production 5xx responses hide internal details while 4xx messages remain', () => {
  const previous = process.env.NODE_ENV;
  const originalError = console.error;
  const logged = [];
  console.error = value => logged.push(value);
  process.env.NODE_ENV = 'production';
  try {
    const invoke = error => {
      let response;
      errorHandler(error, {}, { status(code) { response = { status: code }; return this; }, json(body) { response.body = body; return this; } }, () => {});
      return response;
    };
    const secretError = new Error('private implementation detail');
    secretError.status = 500;
    const serverResponse = invoke(secretError);
    assert.equal(serverResponse.status, 500);
    assert.equal(serverResponse.body.message, 'Something went wrong. Please try again later.');
    assert.equal(logged.length, 1);
    const clientError = Object.assign(new Error('Invalid input'), { status: 400 });
    assert.equal(invoke(clientError).body.message, 'Invalid input');
  } finally {
    process.env.NODE_ENV = previous;
    console.error = originalError;
  }
});
