const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  leaveSubmittedRecipients,
  lateMarkRecipients,
  personalNotificationRecipients,
  managerTargetSummaryRecipients,
} = require('../dist/services/notificationRecipientPolicy');

test('leave submission goes to the branch manager and HR, without notifying the applicant', () => {
  assert.deepEqual(leaveSubmittedRecipients('manager-a', ['hr-a', 'hr-b', 'manager-a']), [
    'manager-a',
    'hr-a',
    'hr-b',
  ]);
});

test('leave decisions and personal payroll/target events stay with the affected employee', () => {
  assert.deepEqual(personalNotificationRecipients('applicant-a'), ['applicant-a']);
  assert.deepEqual(personalNotificationRecipients('employee-a'), ['employee-a']);
});

test('late mark goes to the affected employee and HR only, deduplicated', () => {
  assert.deepEqual(lateMarkRecipients('employee-a', ['hr-a', 'employee-a', 'hr-a']), [
    'employee-a',
    'hr-a',
  ]);
});

test('manager target summary goes to the branch manager only', () => {
  assert.deepEqual(managerTargetSummaryRecipients('manager-a'), ['manager-a']);
  assert.deepEqual(managerTargetSummaryRecipients(null), []);
});
