/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports -- Dynamic module stubs and runtime controller mocks are intentional in this integration harness. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

type AnyRecord = Record<string, any>;

function responseCapture() {
  const result: AnyRecord = { statusCode: 200, body: undefined };
  result.status = (statusCode: number) => {
    result.statusCode = statusCode;
    return result;
  };
  result.json = (body: AnyRecord) => {
    result.body = body;
    return result;
  };
  return result;
}

test('PostgreSQL service estimate submissions serialize concurrent requests and roll back failures', async (t) => {
  const databaseUrl = process.env.XEROCARE_ISOLATED_TEST_DATABASE_URL;
  assert.ok(
    databaseUrl,
    'Set XEROCARE_ISOLATED_TEST_DATABASE_URL to the disposable local test database',
  );
  const parsedUrl = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname));
  assert.equal(
    parsedUrl.port,
    '55432',
    'refusing to run outside the approved disposable test port',
  );
  assert.equal(parsedUrl.pathname, '/postgres');
  assert.equal(parsedUrl.password, '', 'test database must not use application credentials');

  const redisModule = require('redis') as AnyRecord;
  redisModule.createClient = () => ({
    on() {
      return this;
    },
    async connect() {},
    async quit() {},
  });
  if (!process.env.ACCESS_SECRET) process.env.ACCESS_SECRET = 'integration-test-only-secret';

  const [
    { Source },
    { ServiceController },
    { NotificationPublisher, serializeInAppNotificationRequest },
    { ServiceTicket, ServiceTicketStatus, ServiceContext, JobType },
    { ServiceEstimate, ServiceEstimateStatus },
    { ServiceEstimateRevision },
  ] = await Promise.all([
    import('../src/config/db'),
    import('../src/controllers/serviceController'),
    import('../src/events/publisher/notificationPublisher'),
    import('../src/entities/serviceTicketEntity'),
    import('../src/entities/serviceEstimateEntity'),
    import('../src/entities/serviceEstimateRevisionEntity'),
  ]);
  const serviceHelpers = require('../src/helpers/serviceHelpers') as AnyRecord;
  const oldFinanceResolver = serviceHelpers.getFinanceEmployeesByBranch;
  const oldCustomerResolver = serviceHelpers.getCustomerName;
  const oldPublisher = NotificationPublisher.publishInAppRequest;
  const oldUrl = Source.options.url;
  const oldSynchronize = Source.options.synchronize;
  const oldDropSchema = Source.options.dropSchema;
  const oldSsl = Source.options.ssl;

  serviceHelpers.getFinanceEmployeesByBranch = async () => ['00000000-0000-4000-8000-000000000099'];
  serviceHelpers.getCustomerName = async () => 'Integration Customer';
  Source.setOptions({ url: databaseUrl, ssl: false, synchronize: true, dropSchema: true });
  const controller = new ServiceController() as AnyRecord;
  controller.logActivity = async () => undefined;
  const notices: AnyRecord[] = [];
  NotificationPublisher.publishInAppRequest = async (payload: AnyRecord) => {
    // Query through the independent default pool connection: publication must
    // only happen after the transaction's rows are visible to other sessions.
    const ticket = await Source.getRepository(ServiceTicket).findOne({
      where: { id: payload.referenceId },
    });
    notices.push({
      payload: serializeInAppNotificationRequest(payload),
      ticketStatus: ticket?.status,
    });
  };

  const invoke = async (
    handler: (req: AnyRecord, res: AnyRecord, next: (err?: unknown) => void) => Promise<void>,
    req: AnyRecord,
  ) => {
    const res = responseCapture();
    let error: unknown;
    await handler(req, res, (err?: unknown) => {
      error = err;
    });
    return { res, error };
  };
  const makeTicket = async (status: string) =>
    Source.getRepository(ServiceTicket).save(
      Source.getRepository(ServiceTicket).create({
        ticketNumber: `IT-${randomUUID()}`,
        productBrand: 'Test',
        productModel: 'Test',
        productName: 'Test',
        serialNumber: randomUUID(),
        serviceContext: ServiceContext.CHARGEABLE,
        issueDescription: 'Isolated concurrency test',
        jobType: JobType.ONSITE,
        status: status as (typeof ServiceTicketStatus)[keyof typeof ServiceTicketStatus],
        createdBy: randomUUID(),
        branchId: randomUUID(),
        track: 'B',
      }),
    );

  try {
    await Source.initialize();

    await t.test(
      'simultaneous first-estimate submissions persist one pending estimate and publish once',
      async () => {
        const ticket = await makeTicket(ServiceTicketStatus.DIAGNOSED);
        const estimateRepo = Source.getRepository(ServiceEstimate);
        const estimate = await estimateRepo.save(
          estimateRepo.create({
            ticketId: ticket.id,
            status: ServiceEstimateStatus.DRAFT,
            version: 1,
            totalCost: 0,
            labourCost: 0,
          }),
        );
        const start = notices.length;
        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            invoke(controller.submitEstimateForApproval, {
              params: { id: ticket.id },
              user: { userId: ticket.createdBy },
            }),
          ),
        );
        const persisted = await estimateRepo.find({ where: { ticketId: ticket.id } });
        const persistedTicket = await Source.getRepository(ServiceTicket).findOneByOrFail({
          id: ticket.id,
        });
        const produced = notices
          .slice(start)
          .filter((notice) => notice.payload.data.referenceId === ticket.id);

        assert.equal(results.filter(({ error }) => !error).length, 8);
        assert.equal(persisted.length, 1);
        assert.equal(persisted[0].id, estimate.id);
        assert.equal(persisted[0].status, ServiceEstimateStatus.WAITING_FINANCE_APPROVAL);
        assert.equal(persistedTicket.status, ServiceTicketStatus.WAITING_FINANCE_APPROVAL);
        assert.equal(produced.length, 1);
        assert.equal(produced[0].ticketStatus, ServiceTicketStatus.WAITING_FINANCE_APPROVAL);

        await invoke(controller.submitEstimateForApproval, {
          params: { id: ticket.id },
          user: { userId: ticket.createdBy },
        });
        assert.equal((await estimateRepo.find({ where: { ticketId: ticket.id } })).length, 1);
        assert.equal(
          notices.slice(start).filter((notice) => notice.payload.data.referenceId === ticket.id)
            .length,
          1,
        );
      },
    );

    await t.test(
      'simultaneous revision submissions persist one pending revision and publish once',
      async () => {
        const ticket = await makeTicket(ServiceTicketStatus.CUSTOMER_APPROVED);
        const estimateRepo = Source.getRepository(ServiceEstimate);
        await estimateRepo.save(
          estimateRepo.create({
            ticketId: ticket.id,
            status: ServiceEstimateStatus.CUSTOMER_APPROVED,
            version: 1,
            totalCost: 100,
            labourCost: 100,
          }),
        );
        const start = notices.length;
        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            invoke(controller.createEstimateRevision, {
              params: { id: ticket.id },
              body: { labourCost: 25, items: [] },
              user: { userId: ticket.createdBy },
            }),
          ),
        );
        const revisions = await Source.getRepository(ServiceEstimateRevision).find({
          where: { ticketId: ticket.id },
        });
        const persistedTicket = await Source.getRepository(ServiceTicket).findOneByOrFail({
          id: ticket.id,
        });
        const produced = notices
          .slice(start)
          .filter((notice) => notice.payload.data.referenceId === ticket.id);

        assert.equal(results.filter(({ error }) => !error).length, 8);
        assert.equal(revisions.length, 1);
        assert.equal(revisions[0].status, 'WAITING_ADDITIONAL_APPROVAL');
        assert.equal(persistedTicket.status, ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2);
        assert.equal(produced.length, 1);
        assert.equal(produced[0].ticketStatus, ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2);

        await invoke(controller.createEstimateRevision, {
          params: { id: ticket.id },
          body: { labourCost: 25, items: [] },
          user: { userId: ticket.createdBy },
        });
        assert.equal(
          (
            await Source.getRepository(ServiceEstimateRevision).find({
              where: { ticketId: ticket.id },
            })
          ).length,
          1,
        );
        assert.equal(
          notices.slice(start).filter((notice) => notice.payload.data.referenceId === ticket.id)
            .length,
          1,
        );

        const revisionRepo = Source.getRepository(ServiceEstimateRevision);
        revisions[0].status = 'FINANCE_APPROVED';
        revisions[0].financeDecision = 'APPROVED';
        await revisionRepo.save(revisions[0]);
        persistedTicket.status = ServiceTicketStatus.CUSTOMER_APPROVED;
        await Source.getRepository(ServiceTicket).save(persistedTicket);
        const later = await invoke(controller.createEstimateRevision, {
          params: { id: ticket.id },
          body: { labourCost: 30, items: [] },
          user: { userId: ticket.createdBy },
        });
        assert.equal(later.error, undefined);
        const finalRevisions = await revisionRepo.find({ where: { ticketId: ticket.id } });
        assert.equal(finalRevisions.length, 2);
        assert.equal(
          finalRevisions.filter((revision) => revision.status === 'WAITING_ADDITIONAL_APPROVAL')
            .length,
          1,
        );
        assert.equal(
          notices.filter((notice) => notice.payload.data.referenceId === ticket.id).length,
          2,
        );
      },
    );

    await t.test(
      'a database failure after revision insertion rolls back rows, ticket status, and notification',
      async () => {
        const ticket = await makeTicket(ServiceTicketStatus.CUSTOMER_APPROVED);
        const estimateRepo = Source.getRepository(ServiceEstimate);
        await estimateRepo.save(
          estimateRepo.create({
            ticketId: ticket.id,
            status: ServiceEstimateStatus.CUSTOMER_APPROVED,
            version: 1,
            totalCost: 100,
            labourCost: 100,
          }),
        );
        await Source.query(`
        CREATE FUNCTION integration_fail_revision_status() RETURNS trigger AS $$
        BEGIN
          IF NEW.status = 'WAITING_FINANCE_APPROVAL_2' THEN
            RAISE EXCEPTION 'forced isolated test transaction failure';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER integration_fail_revision_status_trigger
        BEFORE UPDATE ON service_tickets
        FOR EACH ROW EXECUTE FUNCTION integration_fail_revision_status();
      `);
        const start = notices.length;
        try {
          const { error } = await invoke(controller.createEstimateRevision, {
            params: { id: ticket.id },
            body: { labourCost: 25, items: [] },
            user: { userId: ticket.createdBy },
          });
          assert.ok(error);
          assert.equal(
            (
              await Source.getRepository(ServiceEstimateRevision).find({
                where: { ticketId: ticket.id },
              })
            ).length,
            0,
          );
          const persistedTicket = await Source.getRepository(ServiceTicket).findOneByOrFail({
            id: ticket.id,
          });
          assert.equal(persistedTicket.status, ServiceTicketStatus.CUSTOMER_APPROVED);
          assert.equal(
            notices.slice(start).filter((notice) => notice.payload.data.referenceId === ticket.id)
              .length,
            0,
          );
        } finally {
          await Source.query(
            'DROP TRIGGER integration_fail_revision_status_trigger ON service_tickets',
          );
          await Source.query('DROP FUNCTION integration_fail_revision_status()');
        }
      },
    );
  } finally {
    NotificationPublisher.publishInAppRequest = oldPublisher;
    serviceHelpers.getFinanceEmployeesByBranch = oldFinanceResolver;
    serviceHelpers.getCustomerName = oldCustomerResolver;
    if (Source.isInitialized) await Source.destroy();
    Source.setOptions({
      url: oldUrl,
      ssl: oldSsl,
      synchronize: oldSynchronize,
      dropSchema: oldDropSchema,
    });
  }
});
