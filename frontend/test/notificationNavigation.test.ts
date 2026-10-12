import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveServiceNotificationTarget } from '../lib/notificationNavigation';
import { shouldMarkNotificationRead } from '../lib/notificationReadPolicy';

const ticketId = 'e0e23ae1-3ca0-4c11-a569-397bd62d6ec2';
const estimateId = '93f1bb58-e69a-4e8d-aacf-68b8e1e5e9a2';
const revisionId = 'a9e6f486-d511-460a-9c91-261bde9a8ddc';

test('ticket and estimate references resolve to role-specific detail targets', () => {
  assert.deepEqual(
    resolveServiceNotificationTarget({ referenceId: ticketId, estimateId }, 'finance'),
    {
      path: `/finance/service-estimates?ticketId=${ticketId}&estimateId=${estimateId}`,
      label: 'Open service ticket',
    },
  );
  assert.equal(
    resolveServiceNotificationTarget({ referenceId: ticketId, revisionId }, 'manager')?.path,
    `/employee/service?ticketId=${ticketId}&revisionId=${revisionId}`,
  );
  assert.equal(
    resolveServiceNotificationTarget({ referenceId: ticketId }, 'admin')?.path,
    `/admin/service?ticketId=${ticketId}`,
  );
});

test('missing and malformed references safely fall back to the role service list', () => {
  assert.equal(resolveServiceNotificationTarget({}, 'employee')?.path, '/employee/service');
  assert.equal(
    resolveServiceNotificationTarget({ referenceId: 'javascript:alert(1)', estimateId }, 'finance')
      ?.path,
    '/finance/service-estimates',
  );
  assert.equal(
    resolveServiceNotificationTarget({ referenceId: ticketId, estimateId: 'bad-id' }, 'employee')
      ?.path,
    '/employee/service',
  );
  assert.equal(resolveServiceNotificationTarget({ referenceId: ticketId }, 'hr'), null);
});

test('header preview and navigation preserve unread state; opening detail marks one read', () => {
  assert.equal(shouldMarkNotificationRead('header-preview'), false);
  assert.equal(shouldMarkNotificationRead('navigate'), false);
  assert.equal(shouldMarkNotificationRead('detail-open'), true);
});
