const assert = require('node:assert/strict');
const { test } = require('node:test');
const bcrypt = require('bcrypt');
const { validatePassword } = require('../dist/utils/passwordPolicy');
const { AuthService } = require('../dist/services/authService');

const goodPassword = 'My very long secure passphrase';

test('password policy rejects missing, blank, whitespace-only, weak, and common passwords', () => {
  for (const password of [undefined, null, '', '     ', '\t', '\n', 'password123', '123456789', 'qwertyuiop', 'Password1!', 'Xerocare@123']) {
    assert.ok(validatePassword(password), `expected rejection for ${String(password)}`);
  }
});

test('password policy accepts a long passphrase with spaces and preserves Unicode', () => {
  assert.equal(validatePassword(goodPassword), null);
  assert.equal(validatePassword('XeroCare@2026Secure'), null);
  assert.equal(validatePassword('安全な長いパスワードと追加の文字列'), null);
});

test('password policy rejects values beyond bcrypt’s 72-byte input boundary', () => {
  assert.ok(validatePassword('a'.repeat(73)));
});

test('reset service rejects invalid passwords before hashing or updating the password', async () => {
  const service = Object.create(AuthService.prototype);
  let updateCalls = 0;
  service.employeeRepo = {
    updatePassword: async () => { updateCalls += 1; },
  };

  await assert.rejects(() => service.resetPassword('employee-id', ''), /Password is required/);
  await assert.rejects(() => service.resetPassword('employee-id', '      '), /Password is required/);
  await assert.rejects(() => service.resetPassword('employee-id', 'password123'), /at least 15 characters/);
  assert.equal(updateCalls, 0, 'invalid password must never reach password update');
});

test('reset service hashes a valid passphrase before updating the password', async () => {
  const service = Object.create(AuthService.prototype);
  let savedHash;
  service.employeeRepo = {
    updatePassword: async (_id, hash) => { savedHash = hash; },
  };

  await service.resetPassword('employee-id', goodPassword);
  assert.ok(savedHash);
  assert.notEqual(savedHash, goodPassword);
  assert.equal(await bcrypt.compare(goodPassword, savedHash), true);
});
