import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  serviceAssignmentRecipients,
  canReviewServiceEstimateBranch,
  serviceEstimateDecisionRecipients,
  uniqueNotificationRecipientIds,
} from '../src/helpers/notificationRecipientPolicy';
import { serializeInAppNotificationRequest } from '../src/events/publisher/notificationPublisher';

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

test('initial assignment notifies only the assigned technician', () => {
  assert.deepEqual(serviceAssignmentRecipients('tech-a'), {
    assigned: ['tech-a'],
    previous: [],
  });
});

test('reassignment notifies the new and previous technicians once each', () => {
  assert.deepEqual(serviceAssignmentRecipients('tech-b', 'tech-a'), {
    assigned: ['tech-b'],
    previous: ['tech-a'],
  });
  assert.deepEqual(serviceAssignmentRecipients('tech-a', 'tech-a'), {
    assigned: [],
    previous: [],
  });
});

test('estimate decisions deduplicate technician, creator, and manager identities', () => {
  assert.deepEqual(serviceEstimateDecisionRecipients('same-user', 'same-user', 'same-user'), [
    'same-user',
  ]);
  assert.deepEqual(serviceEstimateDecisionRecipients('tech-a', 'creator-a', 'manager-a'), [
    'tech-a',
    'creator-a',
    'manager-a',
  ]);
});

test('estimate decision audiences stay limited to the IDs resolved for that branch', () => {
  const branchA = serviceEstimateDecisionRecipients('tech-a', 'creator-a', 'manager-a');
  const branchB = serviceEstimateDecisionRecipients('tech-b', 'creator-b', 'manager-b');
  assert.deepEqual(branchA, ['tech-a', 'creator-a', 'manager-a']);
  assert.deepEqual(branchB, ['tech-b', 'creator-b', 'manager-b']);
  assert.equal(
    branchA.some((id) => branchB.includes(id)),
    false,
  );
});

test('missing technician does not create an assignment recipient', () => {
  assert.deepEqual(serviceAssignmentRecipients(null), { assigned: [], previous: [] });
  assert.deepEqual(serviceAssignmentRecipients('tech-a', null), {
    assigned: ['tech-a'],
    previous: [],
  });
});

test('Finance estimate review requires the same branch unless the reviewer is Admin', () => {
  assert.equal(canReviewServiceEstimateBranch('FINANCE', 'branch-a', 'branch-a'), true);
  assert.equal(canReviewServiceEstimateBranch('FINANCE', 'branch-b', 'branch-a'), false);
  assert.equal(canReviewServiceEstimateBranch('FINANCE', undefined, 'branch-a'), false);
  assert.equal(canReviewServiceEstimateBranch('ADMIN', undefined, 'branch-a'), true);
});

test('in-app broker payload carries deduplicated recipients and frontend reference metadata', () => {
  assert.deepEqual(
    serializeInAppNotificationRequest({
      recipientIds: ['tech-a', 'creator-a', 'tech-a'],
      title: 'Estimate Approved',
      message: 'Ticket ST-1 estimate v2 approved.',
      type: 'INFO',
      referenceId: 'ticket-uuid',
      referenceType: 'SERVICE_TICKET',
    }),
    {
      recipients: ['tech-a', 'creator-a'],
      notifyAdmins: false,
      title: 'Estimate Approved',
      message: 'Ticket ST-1 estimate v2 approved.',
      type: 'INFO',
      data: { referenceId: 'ticket-uuid', referenceType: 'SERVICE_TICKET' },
    },
  );
});
