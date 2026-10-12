import type { ConfirmChannel, ConsumeMessage, Options } from 'amqplib';
import { createRabbitChannel } from '../../config/rabbitmq';
import { Source } from '../../config/db';
import { ServiceEstimateRevision } from '../../entities/serviceEstimateRevisionEntity';
import { ServiceTicket, ServiceTicketStatus } from '../../entities/serviceTicketEntity';
import { serviceEstimateDecisionRecipients } from '../../helpers/notificationRecipientPolicy';
import {
  BillingServiceEstimateDecisionEvent,
  validateBillingDecisionTarget,
} from '../../helpers/billingServiceEstimateDecision';
import { logger } from '../../config/logger';
import { publishConfirmed } from '../../utils/publishConfirmed';

const EXCHANGE = 'domain_events';
const QUEUE = 'veninv.billing.service-estimate-decisions';
const ROUTING_KEY = 'billing.service-estimate.finance-decision';
const RETRY_QUEUE = `${QUEUE}.retry`;
const DEAD_QUEUE = `${QUEUE}.dead`;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 5000, 15000];

function validateEvent(value: unknown): asserts value is BillingServiceEstimateDecisionEvent {
  if (!value || typeof value !== 'object') throw new Error('Decision payload must be an object');
  const event = value as Partial<BillingServiceEstimateDecisionEvent>;
  for (const key of [
    'eventId',
    'eventType',
    'occurredAt',
    'invoiceId',
    'serviceTicketId',
    'vendorRevisionId',
    'decidedBy',
    'decidedAt',
  ] as const) {
    if (typeof event[key] !== 'string' || !event[key])
      throw new Error(`Decision payload has invalid ${key}`);
  }
  if (!Number.isInteger(event.billingRevision) || (event.billingRevision as number) < 1)
    throw new Error('Decision payload has invalid billingRevision');
  if (event.decision !== 'APPROVED' && event.decision !== 'REJECTED')
    throw new Error('Decision payload has invalid decision');
  if (event.decision === 'REJECTED' && typeof event.reason !== 'string')
    throw new Error('Rejected decision has no reason');
}

function retryCount(msg: ConsumeMessage): number {
  const raw = msg.properties.headers?.['x-service-estimate-retry-count'];
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : 0;
}

export async function applyBillingServiceEstimateDecision(
  event: BillingServiceEstimateDecisionEvent,
): Promise<'APPLIED' | 'DUPLICATE' | 'QUARANTINED'> {
  return Source.transaction(async (manager) => {
    const inserted = await manager.query(
      `INSERT INTO billing_decision_inbox
        (event_id, invoice_id, service_ticket_id, vendor_revision_id, billing_revision, outcome)
       VALUES ($1,$2,$3,$4,$5,'PROCESSING')
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [
        event.eventId,
        event.invoiceId,
        event.serviceTicketId,
        event.vendorRevisionId,
        event.billingRevision,
      ],
    );
    if (inserted.length === 0) return 'DUPLICATE';

    const revision = await manager.getRepository(ServiceEstimateRevision).findOne({
      where: { id: event.vendorRevisionId },
      lock: { mode: 'pessimistic_write' },
    });
    const ticket = await manager.getRepository(ServiceTicket).findOne({
      where: { id: event.serviceTicketId },
      lock: { mode: 'pessimistic_write' },
    });
    const mismatch =
      !revision || !ticket
        ? 'Linked service revision or ticket was not found'
        : validateBillingDecisionTarget(event, revision, ticket.id);
    if (mismatch && mismatch !== 'DUPLICATE_DECISION') {
      await manager.query(
        `UPDATE billing_decision_inbox SET outcome='QUARANTINED', error=$2, processed_at=NOW() WHERE event_id=$1`,
        [event.eventId, mismatch],
      );
      return 'QUARANTINED';
    }
    if (!revision || !ticket) {
      await manager.query(
        `UPDATE billing_decision_inbox SET outcome='QUARANTINED', processed_at=NOW() WHERE event_id=$1`,
        [event.eventId],
      );
      return 'QUARANTINED';
    }
    if (mismatch === 'DUPLICATE_DECISION') {
      await manager.query(
        `UPDATE billing_decision_inbox SET outcome='DUPLICATE', processed_at=NOW() WHERE event_id=$1`,
        [event.eventId],
      );
      return 'DUPLICATE';
    }
    if (revision.status !== 'WAITING_ADDITIONAL_APPROVAL') {
      await manager.query(
        `UPDATE billing_decision_inbox SET outcome='QUARANTINED', error='Revision is not awaiting Finance decision', processed_at=NOW() WHERE event_id=$1`,
        [event.eventId],
      );
      return 'QUARANTINED';
    }

    revision.financeDecision = event.decision;
    revision.financeDecisionBy = event.decidedBy;
    revision.financeDecisionAt = new Date(event.decidedAt);
    revision.financeDecisionNote = event.decision === 'REJECTED' ? event.reason : null;
    revision.validUntil = event.estimateValidUntil ? new Date(event.estimateValidUntil) : null;
    revision.status = event.decision === 'APPROVED' ? 'FINANCE_APPROVED' : 'REJECTED';
    await manager.getRepository(ServiceEstimateRevision).save(revision);

    const newer = await manager.query(
      `SELECT id FROM service_estimate_revisions
        WHERE "ticketId"=$1 AND billing_revision > $2 LIMIT 1`,
      [ticket.id, event.billingRevision],
    );
    if (newer.length === 0) {
      ticket.status =
        event.decision === 'APPROVED'
          ? ServiceTicketStatus.FINANCE_APPROVED_2
          : ServiceTicketStatus.ESTIMATE_REVISION_REQUIRED;
      ticket.financeRejectionReason = event.decision === 'REJECTED' ? event.reason : null;
      await manager.getRepository(ServiceTicket).save(ticket);
    }

    const recipients = serviceEstimateDecisionRecipients(
      ticket.assignedTechnicianId,
      ticket.createdBy,
    );
    const approved = event.decision === 'APPROVED';
    const note = {
      title: approved
        ? 'Estimate Revision Approved by Finance'
        : 'Estimate Revision Rejected by Finance',
      message: approved
        ? `Additional estimate revision v${revision.version} for ticket ${ticket.ticketNumber} was approved by Finance.`
        : `Additional estimate revision v${revision.version} for ticket ${ticket.ticketNumber} was rejected by Finance. Reason: ${event.reason}.`,
      type: approved ? 'INFO' : 'TASK',
      referenceId: ticket.id,
      referenceType: 'SERVICE_TICKET',
      data: {
        revisionId: revision.id,
        revisionVersion: revision.version,
        billingRevision: event.billingRevision,
      },
    };
    await manager.query(
      `INSERT INTO service_ticket_activities ("ticketId", "activityType", description, "performedBy")
       VALUES ($1,$2,$3,$4)`,
      [
        ticket.id,
        approved ? 'REVISION_FINANCE_APPROVED' : 'REVISION_FINANCE_REJECTED',
        note.message,
        event.decidedBy,
      ],
    );
    if (recipients.length > 0) {
      await manager.query(
        `INSERT INTO service_decision_notification_outbox (event_id, recipient_ids, payload)
         VALUES ($1,$2::jsonb,$3::jsonb)`,
        [event.eventId, JSON.stringify(recipients), JSON.stringify(note)],
      );
    }
    await manager.query(
      `UPDATE billing_decision_inbox SET outcome='APPLIED', processed_at=NOW() WHERE event_id=$1`,
      [event.eventId],
    );
    return 'APPLIED';
  });
}

export async function consumeBillingServiceEstimateDecision(
  msg: ConsumeMessage,
  channel: ConfirmChannel,
  applyDecision: typeof applyBillingServiceEstimateDecision = applyBillingServiceEstimateDecision,
) {
  try {
    const parsed: unknown = JSON.parse(msg.content.toString());
    validateEvent(parsed);
    const event = parsed;
    if (msg.properties.messageId && msg.properties.messageId !== event.eventId) {
      throw new Error('Rabbit message ID does not match decision event ID');
    }
    await applyDecision(event);
    channel.ack(msg);
  } catch (error) {
    const attempt = retryCount(msg);
    const errorText = error instanceof Error ? error.message : String(error);
    const options: Options.Publish = {
      contentType: msg.properties.contentType,
      messageId: msg.properties.messageId,
      correlationId: msg.properties.correlationId,
      timestamp: msg.properties.timestamp,
      headers: { ...(msg.properties.headers || {}) },
    };
    try {
      if (attempt < MAX_RETRIES) {
        const nextAttempt = attempt + 1;
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        await publishConfirmed(channel, '', RETRY_QUEUE, msg.content, {
          ...options,
          expiration: String(delay),
          headers: { ...options.headers, 'x-service-estimate-retry-count': nextAttempt },
        });
        logger.warn(
          `Service-estimate decision failed; scheduled retry ${nextAttempt}/${MAX_RETRIES}: ${errorText}`,
        );
      } else {
        await publishConfirmed(channel, '', DEAD_QUEUE, msg.content, {
          ...options,
          headers: {
            ...options.headers,
            'x-service-estimate-retry-count': attempt,
            'x-dead-letter-reason': errorText.slice(0, 1000),
            'x-dead-lettered-at': new Date().toISOString(),
          },
        });
        logger.error('Service-estimate decision moved to durable dead-letter queue', {
          error: errorText,
          messageId: msg.properties.messageId,
        });
      }
      channel.ack(msg);
    } catch (publishError) {
      logger.error(
        'Unable to persist retry/dead-letter copy; original will be requeued',
        publishError,
      );
      channel.nack(msg, false, true);
    }
  }
}

export async function startBillingServiceEstimateDecisionConsumer(): Promise<ConfirmChannel> {
  const channel = await createRabbitChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': EXCHANGE, 'x-dead-letter-routing-key': ROUTING_KEY },
  });
  await channel.assertQueue(DEAD_QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
  await channel.prefetch(1);
  await channel.consume(QUEUE, async (msg) => {
    if (msg) await consumeBillingServiceEstimateDecision(msg, channel);
  });
  logger.info('Billing service-estimate decision consumer started');
  return channel;
}
