import { getRabbitChannel } from '../../config/rabbitmq';
import { BranchEventType, BranchCreatedEvent, BranchUpdatedEvent } from '../branchEvents';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';
let exchangeReady = false;

async function ensureExchange(channel: any) {
  if (!exchangeReady) {
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    exchangeReady = true;
  }
}

export async function publishBranchCreated(payload: BranchCreatedEvent) {
  try {
    const channel = await getRabbitChannel();
    await ensureExchange(channel);

    const ok = channel.publish(
      EXCHANGE,
      BranchEventType.CREATED,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );

    if (!ok) {
      logger.warn('RabbitMQ backpressure on branch.created');
    }
  } catch (err) {
    logger.error('Failed to publish branch.created event', err);
  }
}

export async function publishBranchUpdated(payload: BranchUpdatedEvent) {
  try {
    const channel = await getRabbitChannel();
    await ensureExchange(channel);

    const ok = channel.publish(
      EXCHANGE,
      BranchEventType.UPDATED,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );

    if (!ok) {
      logger.warn('RabbitMQ backpressure on branch.updated');
    }
  } catch (err) {
    logger.error('Failed to publish branch.updated event', err);
  }
}

export async function publishBranchDeleted(branchId: string) {
  try {
    const channel = await getRabbitChannel();
    await ensureExchange(channel);

    channel.publish(EXCHANGE, BranchEventType.DELETED, Buffer.from(JSON.stringify({ branchId })), {
      persistent: true,
    });
  } catch (err) {
    logger.error('Failed to publish branch.deleted event', err);
  }
}
