/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports -- Dynamic module stubs and runtime controller mocks are intentional in this unit harness. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

type AnyRecord = Record<string, any>;

async function loadHarness() {
  const redisModule = require('redis') as AnyRecord;
  if (!redisModule.__notificationTestStubbed) {
    redisModule.createClient = () => ({
      on() {
        return this;
      },
      async connect() {
        return undefined;
      },
      async quit() {
        return undefined;
      },
    });
    redisModule.__notificationTestStubbed = true;
  }
  if (!process.env.ACCESS_SECRET) process.env.ACCESS_SECRET = 'unit-test-only-access-secret';
  const [{ ServiceController }, { Source }, notificationModule] = await Promise.all([
    import('../src/controllers/serviceController'),
    import('../src/config/db'),
    import('../src/events/publisher/notificationPublisher'),
  ]);
  // The controller and this test resolve the same CommonJS module object under
  // the repository's ts-node test command, allowing network-free helper stubs.
  const serviceHelpers = require('../src/helpers/serviceHelpers') as AnyRecord;
  return {
    ServiceController,
    Source,
    NotificationPublisher: notificationModule.NotificationPublisher,
    serializeInAppNotificationRequest: notificationModule.serializeInAppNotificationRequest,
    serviceHelpers,
  };
}

async function runWithMocks(
  repositories: Record<string, AnyRecord>,
  run: (controller: AnyRecord, notices: AnyRecord[]) => Promise<void>,
) {
  const { ServiceController, Source, NotificationPublisher, serializeInAppNotificationRequest } =
    await loadHarness();
  const originalGetRepository = Source.getRepository;
  const originalCreateQueryRunner = Source.createQueryRunner;
  const originalPublish = NotificationPublisher.publishInAppRequest;
  const notices: AnyRecord[] = [];
  (Source as AnyRecord).getRepository = (entity: { name: string }) => {
    const repository = repositories[entity.name];
    if (!repository) throw new Error(`Unexpected repository access: ${entity.name}`);
    return repository;
  };
  (Source as AnyRecord).createQueryRunner = () => {
    let active = false;
    let released = false;
    const getRepository = (entity: { name: string }) => {
      const repository = repositories[entity.name];
      if (!repository) throw new Error(`Unexpected repository access: ${entity.name}`);
      return repository;
    };
    return {
      manager: {
        findOne: (entity: { name: string }, options: AnyRecord) =>
          getRepository(entity).findOne(options),
        getRepository,
      },
      get isTransactionActive() {
        return active;
      },
      get isReleased() {
        return released;
      },
      async connect() {},
      async startTransaction() {
        active = true;
      },
      async commitTransaction() {
        active = false;
      },
      async rollbackTransaction() {
        active = false;
      },
      async release() {
        released = true;
      },
    };
  };
  NotificationPublisher.publishInAppRequest = async (payload: AnyRecord) => {
    notices.push(serializeInAppNotificationRequest(payload));
  };
  const controller = new ServiceController() as AnyRecord;
  controller.logActivity = async () => undefined;
  try {
    await run(controller, notices);
  } finally {
    (Source as AnyRecord).getRepository = originalGetRepository;
    (Source as AnyRecord).createQueryRunner = originalCreateQueryRunner;
    NotificationPublisher.publishInAppRequest = originalPublish;
  }
}

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

test('assignment notifies the new technician and suppresses duplicate manager recipient', async () => {
  const ticket = {
    id: 'ticket-a',
    ticketNumber: 'ST-1',
    branchId: 'branch-a',
    createdBy: 'tech-a',
    assignedTechnicianId: null,
    status: 'OPEN',
  };
  const { serviceHelpers } = await loadHarness();
  await runWithMocks(
    {
      ServiceTicket: { findOne: async () => ticket, save: async () => ticket },
      Branch: { findOne: async () => ({ manager_id: 'tech-a' }) },
    },
    async (controller, notices) => {
      const res = responseCapture();
      let nextError: unknown;
      await controller.assignTechnician(
        {
          params: { id: ticket.id },
          body: { assignedTechnicianId: 'tech-a' },
          user: { role: 'ADMIN', userId: 'admin-a' },
        },
        res,
        (err: unknown) => {
          nextError = err;
        },
      );
      assert.equal(nextError, undefined);
      assert.equal(res.statusCode, 200);
      assert.equal(notices.length, 1);
      assert.deepEqual(notices[0].recipients, ['tech-a']);
      assert.equal(notices[0].data.referenceId, ticket.id);
    },
  );
  assert.equal(typeof serviceHelpers.getFinanceEmployeesByBranch, 'function');
});

test('reassignment notifies old and new technicians, with manager notice only when distinct', async () => {
  const ticket = {
    id: 'ticket-a',
    ticketNumber: 'ST-1',
    branchId: 'branch-a',
    createdBy: 'creator-a',
    assignedTechnicianId: 'tech-old',
    status: 'ASSIGNED',
  };
  await runWithMocks(
    {
      ServiceTicket: { findOne: async () => ticket, save: async () => ticket },
      Branch: { findOne: async () => ({ manager_id: 'manager-a' }) },
    },
    async (controller, notices) => {
      const res = responseCapture();
      await controller.assignTechnician(
        {
          params: { id: ticket.id },
          body: { assignedTechnicianId: 'tech-new' },
          user: { role: 'ADMIN', userId: 'admin-a' },
        },
        res,
        (err: unknown) => {
          throw err;
        },
      );
      assert.equal(notices.length, 3);
      assert.deepEqual(
        notices.map((notice) => notice.recipients[0]),
        ['tech-old', 'tech-new', 'manager-a'],
      );
    },
  );
});

test('first estimate submission notifies only Finance resolved for the ticket branch with ticket reference', async () => {
  const estimate = {
    id: 'estimate-a',
    ticketId: 'ticket-a',
    version: 1,
    status: 'DRAFT',
    items: [],
    totalCost: 0,
  };
  const ticket = {
    id: 'ticket-a',
    ticketNumber: 'ST-1',
    branchId: 'branch-a',
    createdBy: 'creator-a',
    customerId: null,
    productBrand: 'Brand',
    productModel: 'Model',
    status: 'DIAGNOSED',
  };
  const { serviceHelpers } = await loadHarness();
  const oldFinanceResolver = serviceHelpers.getFinanceEmployeesByBranch;
  const oldCustomerResolver = serviceHelpers.getCustomerName;
  serviceHelpers.getFinanceEmployeesByBranch = async (branchId: string) => {
    assert.equal(branchId, 'branch-a');
    return ['finance-a', 'finance-a'];
  };
  serviceHelpers.getCustomerName = async () => 'Customer A';
  try {
    await runWithMocks(
      {
        ServiceEstimate: { findOne: async () => estimate, save: async () => estimate },
        ServiceTicket: { findOne: async () => ticket, save: async () => ticket },
      },
      async (controller, notices) => {
        const res = responseCapture();
        await controller.submitEstimateForApproval(
          { params: { id: ticket.id }, user: { userId: 'tech-a' } },
          res,
          (err: unknown) => {
            throw err;
          },
        );
        assert.equal(res.statusCode, 200);
        assert.equal(notices.length, 1);
        assert.deepEqual(notices[0].recipients, ['finance-a']);
        assert.equal(notices[0].data.referenceId, ticket.id);
        assert.equal(notices[0].data.referenceType, 'SERVICE_TICKET');
        assert.equal(notices[0].data.estimateId, estimate.id);
        assert.equal(notices[0].data.estimateVersion, estimate.version);
      },
    );
  } finally {
    serviceHelpers.getFinanceEmployeesByBranch = oldFinanceResolver;
    serviceHelpers.getCustomerName = oldCustomerResolver;
  }
});

test('first estimate resubmission returns the pending estimate without another notification', async () => {
  const pending = { id: 'estimate-a', ticketId: 'ticket-a', status: 'WAITING_FINANCE_APPROVAL' };
  const { serviceHelpers } = await loadHarness();
  const oldFinanceResolver = serviceHelpers.getFinanceEmployeesByBranch;
  serviceHelpers.getFinanceEmployeesByBranch = async () => ['finance-a'];
  try {
    await runWithMocks(
      {
        ServiceTicket: {
          findOne: async () => ({ id: 'ticket-a', status: 'WAITING_FINANCE_APPROVAL' }),
        },
        ServiceEstimate: {
          findOne: async ({ where }: AnyRecord) => (where.status === 'DRAFT' ? null : pending),
        },
      },
      async (controller, notices) => {
        const res = responseCapture();
        await controller.submitEstimateForApproval(
          { params: { id: 'ticket-a' } },
          res,
          (err: unknown) => {
            throw err;
          },
        );
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.data, pending);
        assert.equal(notices.length, 0);
      },
    );
  } finally {
    serviceHelpers.getFinanceEmployeesByBranch = oldFinanceResolver;
  }
});

test('additional estimate submission targets branch Finance and a retry does not notify again', async () => {
  const ticket = {
    id: 'ticket-a',
    ticketNumber: 'ST-1',
    branchId: 'branch-a',
    createdBy: 'creator-a',
    status: 'CUSTOMER_APPROVED',
  };
  const activeEstimate = {
    id: 'estimate-a',
    ticketId: ticket.id,
    status: 'CUSTOMER_APPROVED',
    version: 1,
  };
  let pendingRevision: AnyRecord | null = null;
  const revisionRepository = {
    findOne: async () => pendingRevision,
    create: (values: AnyRecord) => ({ ...values, id: 'revision-a' }),
    save: async (revision: AnyRecord) => {
      pendingRevision = revision;
      return revision;
    },
  };
  const { serviceHelpers } = await loadHarness();
  const oldFinanceResolver = serviceHelpers.getFinanceEmployeesByBranch;
  serviceHelpers.getFinanceEmployeesByBranch = async (branchId: string) => {
    assert.equal(branchId, 'branch-a');
    return ['finance-a', 'finance-a'];
  };
  try {
    await runWithMocks(
      {
        ServiceTicket: { findOne: async () => ticket, save: async (value: AnyRecord) => value },
        ServiceEstimate: {
          findOne: async () => activeEstimate,
          save: async (value: AnyRecord) => value,
        },
        ServiceEstimateRevision: revisionRepository,
        ServiceEstimateItem: { create: (value: AnyRecord) => value },
        SparePart: { findOne: async () => null },
      },
      async (controller, notices) => {
        controller.resolveItemCoverage = async () => ({});
        controller.resolveItemIsFree = () => false;
        const firstResponse = responseCapture();
        await controller.createEstimateRevision(
          {
            params: { id: ticket.id },
            body: { labourCost: 50, items: [] },
            user: { userId: 'tech-a' },
          },
          firstResponse,
          (err: unknown) => {
            throw err;
          },
        );
        assert.equal(firstResponse.statusCode, 201);
        assert.equal(notices.length, 1);
        assert.deepEqual(notices[0].recipients, ['finance-a']);
        assert.equal(notices[0].data.referenceId, ticket.id);
        assert.equal(notices[0].data.referenceType, 'SERVICE_TICKET');
        assert.equal(notices[0].data.revisionId, 'revision-a');
        assert.equal(notices[0].data.revisionVersion, 2);

        const retryResponse = responseCapture();
        await controller.createEstimateRevision(
          {
            params: { id: ticket.id },
            body: { labourCost: 50, items: [] },
            user: { userId: 'tech-a' },
          },
          retryResponse,
          (err: unknown) => {
            throw err;
          },
        );
        assert.equal(retryResponse.statusCode, 200);
        assert.equal(notices.length, 1);
      },
    );
  } finally {
    serviceHelpers.getFinanceEmployeesByBranch = oldFinanceResolver;
  }
});

test('Finance decisions notify technician and creator, deduplicate manager, and include ticket references', async () => {
  for (const decision of ['approve', 'reject'] as const) {
    const estimate = {
      id: 'estimate-a',
      ticketId: 'ticket-a',
      version: 3,
      status: 'WAITING_FINANCE_APPROVAL',
      totalCost: 25,
      items: [],
    };
    const ticket = {
      id: 'ticket-a',
      ticketNumber: 'ST-1',
      branchId: 'branch-a',
      createdBy: 'creator-a',
      assignedTechnicianId: 'tech-a',
      status: 'WAITING_FINANCE_APPROVAL',
      serviceQuotationId: null,
    };
    await runWithMocks(
      {
        ServiceEstimate: {
          findOne: async () => estimate,
          save: async (value: AnyRecord) => value,
        },
        ServiceTicket: { findOne: async () => ticket, save: async (value: AnyRecord) => value },
        Branch: { findOne: async () => ({ manager_id: 'creator-a' }) },
      },
      async (controller, notices) => {
        const res = responseCapture();
        const handler =
          decision === 'approve'
            ? controller.approveEstimateFinance
            : controller.rejectEstimateFinance;
        const nextErrors: unknown[] = [];
        await handler(
          {
            params: { estimateId: estimate.id },
            body: { remarks: 'Review needed' },
            user: { role: 'FINANCE', branchId: 'branch-a', userId: 'finance-a' },
          },
          res,
          (err: unknown) => {
            nextErrors.push(err);
          },
        );
        assert.equal(nextErrors.length, 0);
        assert.equal(notices.length, 1);
        assert.deepEqual(notices[0].recipients, ['tech-a', 'creator-a']);
        assert.equal(notices[0].data.referenceId, ticket.id);
        assert.equal(notices[0].data.referenceType, 'SERVICE_TICKET');
        assert.equal(notices[0].data.estimateId, estimate.id);
        assert.equal(notices[0].data.estimateVersion, estimate.version);
        assert.match(notices[0].message, /ST-1/);
        assert.match(notices[0].message, /v3/);
      },
    );
  }
});

test('second Finance approval and rejection notify the ticket technician and creator', async () => {
  for (const decision of ['approve', 'reject'] as const) {
    const revision = {
      id: 'revision-a',
      ticketId: 'ticket-a',
      version: 2,
      status: 'WAITING_ADDITIONAL_APPROVAL',
      financeDecision: null,
      invoiceId: null,
    };
    const ticket = {
      id: 'ticket-a',
      ticketNumber: 'ST-1',
      branchId: 'branch-a',
      createdBy: 'creator-a',
      assignedTechnicianId: 'tech-a',
      status: 'WAITING_FINANCE_APPROVAL_2',
    };
    await runWithMocks(
      {
        ServiceEstimateRevision: {
          findOne: async () => revision,
          save: async (value: AnyRecord) => value,
        },
        ServiceTicket: { findOne: async () => ticket, save: async (value: AnyRecord) => value },
      },
      async (controller, notices) => {
        const res = responseCapture();
        const handler =
          decision === 'approve'
            ? controller.approveRevisionFinance
            : controller.rejectRevisionFinance;
        const errors: unknown[] = [];
        await handler(
          {
            params: { revisionId: revision.id },
            body: { remarks: 'Needs revision' },
            user: { role: 'FINANCE', branchId: 'branch-a', userId: 'finance-a' },
          },
          res,
          (err: unknown) => {
            errors.push(err);
          },
        );
        assert.equal(errors.length, 0);
        assert.equal(notices.length, 1);
        assert.deepEqual(notices[0].recipients, ['tech-a', 'creator-a']);
        assert.equal(notices[0].data.referenceId, ticket.id);
        assert.equal(notices[0].data.referenceType, 'SERVICE_TICKET');
        assert.equal(notices[0].data.revisionId, revision.id);
        assert.equal(notices[0].data.revisionVersion, revision.version);
        assert.match(notices[0].message, /revision v2/i);
        assert.match(notices[0].message, /ST-1/);
      },
    );
  }
});

test('customer decision notice policy deduplicates creator, technician, and manager recipients', async () => {
  const ticket = {
    id: 'ticket-a',
    ticketNumber: 'ST-1',
    branchId: 'branch-a',
    createdBy: 'creator-a',
    assignedTechnicianId: 'manager-a',
  };
  await runWithMocks(
    { Branch: { findOne: async () => ({ manager_id: 'manager-a' }) } },
    async (controller, notices) => {
      await controller.notifyCustomerEstimateDecision(ticket, 'REJECTED', 'Customer declined');
      await controller.notifyCustomerEstimateDecision(ticket, 'REJECTED', 'Customer declined');
      assert.equal(notices.length, 2);
      for (const notice of notices) {
        assert.deepEqual(notice.recipients, ['manager-a', 'creator-a']);
        assert.equal(notice.data.referenceId, ticket.id);
        assert.equal(notice.data.referenceType, 'SERVICE_TICKET');
      }
    },
  );
});

test('unauthorized or invalid Finance transitions do not notify or save state', async () => {
  const estimate = { id: 'estimate-a', ticketId: 'ticket-a', version: 1, status: 'DRAFT' };
  const ticket = { id: 'ticket-a', branchId: 'branch-a', status: 'WAITING_FINANCE_APPROVAL' };
  let saves = 0;
  await runWithMocks(
    {
      ServiceEstimate: {
        findOne: async () => estimate,
        save: async () => {
          saves++;
        },
      },
      ServiceTicket: {
        findOne: async () => ticket,
        save: async () => {
          saves++;
        },
      },
    },
    async (controller, notices) => {
      const res = responseCapture();
      let nextError: AnyRecord | undefined;
      await controller.approveEstimateFinance(
        {
          params: { estimateId: estimate.id },
          user: { role: 'FINANCE', branchId: undefined, userId: 'finance-a' },
        },
        res,
        (err: AnyRecord) => {
          nextError = err;
        },
      );
      assert.equal(nextError?.statusCode, 403);
      assert.equal(saves, 0);
      assert.equal(notices.length, 0);
    },
  );

  const invalidEstimate = { id: 'estimate-b', ticketId: 'ticket-b', status: 'DRAFT' };
  let invalidSaves = 0;
  await runWithMocks(
    {
      ServiceEstimate: {
        findOne: async () => invalidEstimate,
        save: async () => {
          invalidSaves++;
        },
      },
      ServiceTicket: {
        findOne: async () => ({
          id: 'ticket-b',
          branchId: 'branch-a',
          status: 'WAITING_FINANCE_APPROVAL',
        }),
        save: async () => {
          invalidSaves++;
        },
      },
    },
    async (controller, notices) => {
      const res = responseCapture();
      let nextError: AnyRecord | undefined;
      await controller.rejectEstimateFinance(
        {
          params: { estimateId: invalidEstimate.id },
          body: { remarks: 'Rejected' },
          user: { role: 'FINANCE', branchId: 'branch-a', userId: 'finance-a' },
        },
        res,
        (err: AnyRecord) => {
          nextError = err;
        },
      );
      assert.equal(nextError?.statusCode, 400);
      assert.equal(invalidSaves, 0);
      assert.equal(notices.length, 0);
    },
  );
});
