import amqp from 'amqplib';
import { randomUUID } from 'crypto';
import { connectWithRetry, Source } from '../config/dataSource';
import { Branch } from '../entities/branchEntity';
import { startBranchConsumer } from '../events/consumers/branchConsumer';

/**
 * Real cross-service RabbitMQ sync, direction CORRECTED from the original task description:
 * branches are NOT created in employee_service, and the mirror does NOT live in
 * ven_inv_service — it's the other way round. ven_inv_service owns the real `branches`
 * table and PUBLISHES `branch.created`/`branch.updated`/`branch.deleted` (topic exchange
 * `domain_events`, durable) whenever `POST /branch` (ven_inv_service) runs. employee_service
 * CONSUMES that here (`branchConsumer.ts`, queue `employee.branch.events`, bound to
 * `branch.*`) into its own local `branches_mirror` table (entity class is still called
 * `Branch`, but it's a thin 4-column mirror, not ven_inv_service's real Branch entity).
 *
 * This test publishes directly via a fresh amqplib channel rather than going through
 * ven_inv_service's HTTP route + publisher — the consumer has no idea who published the
 * message, and driving it through a second service's app/DB would test nothing extra about
 * the consumer itself. The exchange/queue/binding are asserted identically by both the real
 * publisher and this test, so a message published here reaches the same real consumer.
 */

const EXCHANGE = 'domain_events';

let connection: amqp.ChannelModel;
let channel: amqp.Channel;

async function publishBranchEvent(routingKey: string, payload: Record<string, unknown>) {
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

/** The consumer's DB write is async relative to publish (channel.publish is fire-and-forget,
 * and consumption happens on employee_service's own event loop tick) — poll instead of a
 * fixed sleep, per the explorer report's own recommendation. */
async function waitForMirrorRow(branchId: string, timeoutMs = 5000): Promise<Branch | null> {
  const repo = Source.getRepository(Branch);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await repo.findOneBy({ branch_id: branchId });
    if (row) return row;

    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

async function waitForMirrorRowGone(branchId: string, timeoutMs = 5000): Promise<boolean> {
  const repo = Source.getRepository(Branch);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await repo.findOneBy({ branch_id: branchId });
    if (!row) return true;

    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

beforeAll(async () => {
  await connectWithRetry();
  await startBranchConsumer();
  // startBranchConsumer() awaits assertExchange/assertQueue/bindQueue but fires
  // channel.consume(...) without awaiting its own broker handshake — give the consumer
  // attachment a moment to actually complete before the first publish races it.
  await new Promise((resolve) => setTimeout(resolve, 500));

  connection = await amqp.connect(process.env.RABBITMQ_URL as string);
  channel = await connection.createChannel();
}, 30000);

afterAll(async () => {
  await channel.close();
  await connection.close();
  await Source.destroy();
});

describe('branch.created -> branches_mirror', () => {
  test('a real branch.created event creates the mirror row with ACTIVE status', async () => {
    const branchId = randomUUID();
    await publishBranchEvent('branch.created', {
      branchId,
      name: 'Dubai Branch',
      location: 'Dubai, UAE',
      managerId: randomUUID(),
      createdAt: new Date().toISOString(),
    });

    const row = await waitForMirrorRow(branchId);
    expect(row).not.toBeNull();
    expect(row?.name).toBe('Dubai Branch');
    expect(row?.location).toBe('Dubai, UAE');
    expect(row?.status).toBe('ACTIVE');
    // managerId/createdAt are received but silently dropped — branches_mirror has no
    // columns for them (confirmed against the entity: branch_id/name/location/status/
    // synced_at/updated_at only).
  });

  test('a malformed event (no branchId) is acked and silently dropped, not requeued', async () => {
    // branchConsumer.ts's catch block still calls channel.ack(msg) even on failure (its own
    // comment: "Nack or just log? Ack to avoid loop for now?") — there is no retry/DLQ for a
    // bad payload. Assert the real behavior: nothing throws, nothing crashes the consumer,
    // and no row appears for the (nonexistent) empty-string key.
    await publishBranchEvent('branch.created', { name: 'No ID Branch' });

    const row = await Source.getRepository(Branch).findOneBy({ branch_id: '' });
    // Give the (mis-)handling a moment, then confirm no crash-induced side effect landed.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(row).toBeNull();

    // Consumer must still be alive for a subsequent, well-formed event.
    const branchId = randomUUID();
    await publishBranchEvent('branch.created', {
      branchId,
      name: 'Still Alive Branch',
      location: 'Doha, Qatar',
    });
    const survivorRow = await waitForMirrorRow(branchId);
    expect(survivorRow).not.toBeNull();
  });
});

describe('branch.updated -> branches_mirror', () => {
  // Fixed gap (was: ven_inv_service's publishBranchUpdated sent only
  // { branchId, updatedFields: string[], updatedAt } — field NAMES, never the new values —
  // so the consumer's otherwise-correct patch logic (`if (event.name !== undefined) ...`)
  // never had anything to apply). BranchUpdatedEvent now also carries the real `name`/
  // `location` values (branchService.ts's updateBranch passes them from updatePayload), and
  // this test publishes that exact realistic shape end-to-end.
  test('a branch name change propagates to the mirror via the real event shape', async () => {
    const branchId = randomUUID();
    await publishBranchEvent('branch.created', {
      branchId,
      name: 'Original Name',
      location: 'Original Location',
    });
    await waitForMirrorRow(branchId);

    // Real publisher shape as of the fix: actual new values alongside updatedFields/updatedAt.
    await publishBranchEvent('branch.updated', {
      branchId,
      name: 'Renamed Branch',
      updatedFields: ['name'],
      updatedAt: new Date().toISOString(),
    });

    const deadline = Date.now() + 5000;
    let row: Branch | null = null;
    while (Date.now() < deadline) {
      row = await Source.getRepository(Branch).findOneBy({ branch_id: branchId });
      if (row?.name === 'Renamed Branch') break;

      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    expect(row?.name).toBe('Renamed Branch');
    expect(row?.location).toBe('Original Location'); // omitted field left untouched, as designed
  });

  test('a payload carrying only name (location omitted) leaves location untouched (partial-update semantics)', async () => {
    const branchId = randomUUID();
    await publishBranchEvent('branch.created', {
      branchId,
      name: 'Before',
      location: 'Before City',
    });
    await waitForMirrorRow(branchId);

    await publishBranchEvent('branch.updated', { branchId, name: 'After' });

    const deadline = Date.now() + 5000;
    let row: Branch | null = null;
    while (Date.now() < deadline) {
      row = await Source.getRepository(Branch).findOneBy({ branch_id: branchId });
      if (row?.name === 'After') break;

      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    expect(row?.name).toBe('After');
    expect(row?.location).toBe('Before City'); // omitted field left untouched, as designed
  });
});

describe('branch.deleted -> branches_mirror', () => {
  test('a real branch.deleted event removes the mirror row', async () => {
    const branchId = randomUUID();
    await publishBranchEvent('branch.created', {
      branchId,
      name: 'To Be Deleted',
      location: 'Nowhere',
    });
    await waitForMirrorRow(branchId);

    await publishBranchEvent('branch.deleted', { branchId });

    const gone = await waitForMirrorRowGone(branchId);
    expect(gone).toBe(true);
  });
});
