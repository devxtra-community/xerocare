import assert from 'node:assert/strict';
import { test } from 'node:test';
import { uniqueNotificationRecipientIds } from '../src/helpers/notificationRecipientPolicy';

test('branch role overlap produces one notification per employee', () => {
  assert.deepEqual(
    uniqueNotificationRecipientIds('branch-a-manager', ['branch-a-manager', 'branch-a-finance']),
    ['branch-a-manager', 'branch-a-finance'],
  );
});

test('branch-scoped callers do not receive a different branch audience implicitly', () => {
  assert.deepEqual(uniqueNotificationRecipientIds(['branch-a-manager']), ['branch-a-manager']);
  assert.deepEqual(uniqueNotificationRecipientIds(['branch-b-manager']), ['branch-b-manager']);
});

test('missing recipient IDs are omitted', () => {
  assert.deepEqual(uniqueNotificationRecipientIds(null, undefined, [null, '']), []);
});
