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

      if (routingKey === 'branch.created') {
        await repo.save({
          branch_id: event.branchId || event.id,
          name: event.name,
          location: event.location,
          status: 'ACTIVE',
        });
      } else if (routingKey === 'branch.updated') {
        // branch.updated carries only { branchId, updatedFields[], updatedAt } — no field values.
        // Blindly saving would write undefined into name/location, corrupting the mirror row.
        // Only update fields that are actually present in the payload.
        const branchId = event.branchId || event.id;
        if (!branchId) {
          logger.warn('branch.updated event missing branchId — skipping', event);
        } else {
          const patch: Partial<{ name: string; location: string; status: string }> = {};
          if (event.name !== undefined) patch.name = event.name;
          if (event.location !== undefined) patch.location = event.location;
          if (Object.keys(patch).length > 0) {
            await repo.update({ branch_id: branchId }, patch);
          } else {
            logger.debug('branch.updated carries no field values — mirror unchanged', { branchId });
          }
        }
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
