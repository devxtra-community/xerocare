import { createRabbitChannel } from '../../config/rabbitmq';
import { Source } from '../../config/db';
import { EmployeeManager } from '../../entities/employeeManagerEntity';
import { Branch } from '../../entities/branchEntity';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';
const QUEUE = 'veninv.employee.events';

async function clearManagerFromBranches(employeeId: string) {
  await Source.getRepository(Branch).update({ manager_id: employeeId }, { manager_id: undefined });
}

async function assignManagerToBranch(employeeId: string, branchId: string) {
  // Clear this manager from any branch they're currently on (handles re-assignments)
  await clearManagerFromBranches(employeeId);
  // Assign to the new branch
  await Source.getRepository(Branch).update({ id: branchId }, { manager_id: employeeId });
}

export async function startEmployeeConsumer() {
  const channel = await createRabbitChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, 'employee.*');

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const routingKey = msg.fields.routingKey;
      const event = JSON.parse(msg.content.toString());
      const managerRepo = Source.getRepository(EmployeeManager);

      if (routingKey === 'employee.deleted') {
        // Remove from branch assignment and manager table
        await clearManagerFromBranches(event.employeeId);
        await managerRepo.delete({ employee_id: event.employeeId });
        channel.ack(msg);
        return;
      }

      if (event.role !== 'MANAGER' || event.status === 'INACTIVE') {
        // Not a manager (or deactivated) — clear branch assignment and remove from manager table
        await clearManagerFromBranches(event.employeeId);
        await managerRepo.delete({ employee_id: event.employeeId });
        channel.ack(msg);
        return;
      }

      // Upsert the manager record
      await managerRepo.upsert(
        {
          employee_id: event.employeeId,
          email: event.email,
          status: event.status.toUpperCase(),
          name: event.name,
        },
        ['employee_id'],
      );

      // Sync branch assignment
      if (event.branchId) {
        await assignManagerToBranch(event.employeeId, event.branchId);
        logger.info(
          `[EMPLOYEE_CONSUMER] Assigned manager ${event.employeeId} to branch ${event.branchId}`,
        );
      } else {
        // Manager exists but has no branch — clear any stale assignment
        await clearManagerFromBranches(event.employeeId);
      }

      channel.ack(msg);
    } catch (err) {
      logger.error('Employee consumer failed', err);
      channel.ack(msg);
    }
  });

  logger.info('Employee consumer started and listening for events');
}
