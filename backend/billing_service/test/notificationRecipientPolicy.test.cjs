const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  uniqueNotificationRecipients,
  personalNotificationRecipients,
  branchBusinessNotificationRecipients,
  actionRequiredNotificationRecipients,
  managerSummaryRecipients,
} = require('../src/services/notificationRecipientPolicy');

test('personal events route only to the affected employee', () => {
  assert.deepEqual(personalNotificationRecipients('employee-a'), ['employee-a']);
});

test('branch activity includes the branch manager and relevant employee once', () => {
  assert.deepEqual(branchBusinessNotificationRecipients('employee-a', ['employee-a']), [
    'employee-a',
  ]);
  assert.deepEqual(branchBusinessNotificationRecipients('branch-a-manager', ['creator-a']), [
    'branch-a-manager',
    'creator-a',
  ]);
});

test('action events include only action owners and the requester', () => {
  assert.deepEqual(actionRequiredNotificationRecipients(['finance-a', 'finance-a'], 'requester-a'), [
    'finance-a',
    'requester-a',
  ]);
});

test('management summaries target one branch manager', () => {
  assert.deepEqual(managerSummaryRecipients('branch-a-manager'), ['branch-a-manager']);
  assert.deepEqual(managerSummaryRecipients(null), []);
});

test('deduplicates recipients shared by manager and finance audiences', () => {
  const branchAManager = 'employee-a';
  const branchAFinance = ['employee-a', 'employee-b'];
  const branchBManager = 'employee-c';

  assert.deepEqual(
    uniqueNotificationRecipients([branchAManager], branchAFinance),
    ['employee-a', 'employee-b'],
  );
  assert.deepEqual(uniqueNotificationRecipients(branchBManager), ['employee-c']);
});

test('omits missing recipients without widening to another audience', () => {
  assert.deepEqual(uniqueNotificationRecipients(null, undefined, []), []);
});
