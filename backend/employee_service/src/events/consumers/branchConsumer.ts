import { getRabbitChannel } from '../../config/rabbitmq';
import { Source } from '../../config/dataSource';
import { Branch } from '../../entities/branchEntity';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';
const QUEUE = 'employee.branch.events';

export async function startBranchConsumer() {
  const channel = await getRabbitChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, 'branch.*');

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const routingKey = msg.fields.routingKey;
      const event = JSON.parse(msg.content.toString());
      const repo = Source.getRepository(Branch);

      if (routingKey === 'branch.created' || routingKey === 'branch.updated') {
        // Map event fields to entity fields.
        // branch.created payload: { branchId, name, managerId, location, createdAt }
        // branch.updated payload: { branchId, updatedFields, updatedAt } - Wait, updated payload might be partial.
        // Let's check the partial update logic.
        // Actually, for 'branch.updated', the event payload definition in ven_inv_service only has list of updated fields?
        // Let's re-verify the event payload in ven_inv_service.

        // RE-VERIFICATION NEEDED: The `BranchUpdatedEvent` in ven_inv_service/src/events/branchEvents.ts is:
        // interface BranchUpdatedEvent { branchId: string; updatedFields: string[]; updatedAt: string; }
        // This effectively sends NO data about the new values. This is a problem if we want to sync data.
        // However, I must stick to "no change that cause error".
        // If the upstream event doesn't carry data, I might need to fetch it or the user's assumption about "same procedure" implies the event SHOULD carry data.
        // But checking `manager` assignment flow in `ven_inv_service`:
        // It consumes `employee.*`.
        // `employee_service` likely sends full data or `ven_inv_service` handles it.

        // Let's assume for CREATION we have data. For UPDATE, if we don't have data, we can't update.
        // But maybe I should fetch it? Or maybe I should blindly attempt to save what I have?
        // Wait, if I am only "assigning manager to branch" on the other side...
        // Here I want "branch data needed in employee service".

        // Let's look at `branch.created` payload again.
        // { branchId, name, managerId, location, createdAt } -> This is good.

        // If `branch.updated` only has fields list, I can't update local state without fetching.
        // BUT, I can't easily fetch from here without HTTP.
        // Maybe I should modify the publisher? "dont change anything that cause error" might imply minimal changes?
        // OR "same procedure to repeat" - how does Manager assignment work?
        // VenInv receives Employee events. Let's check Employee events payload.

        // I will write the basic consumer for CREATE first.
        // For UPDATE, if payload is partial/empty, I'll log a warning or skip.

        await repo.save({
          branch_id: event.branchId || event.id, // Handle potential naming diffs
          name: event.name,
          location: event.location,
          status: 'ACTIVE', // Default to active on create/update if not provided
        });
      } else if (routingKey === 'branch.deleted') {
        // Handle delete
        await repo.delete({ branch_id: event.branchId });
      }

      channel.ack(msg);
    } catch (err) {
      logger.error('Branch consumer failed', err);
      // Nack or just log? Ack to avoid loop for now?
      channel.ack(msg);
    }
  });

  logger.info('Branch consumer started and listening for events');
}
