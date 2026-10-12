/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-function-type -- Dynamic module stubs and Express handler harnesses intentionally cross runtime boundaries in this integration test. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

test('Billing decision inbox applies an exact revision once and quarantines mismatches', async (t) => {
  const databaseUrl = process.env.XEROCARE_SERVICE_DECISION_TEST_DATABASE_URL;
  assert.ok(
    databaseUrl,
    'Set XEROCARE_SERVICE_DECISION_TEST_DATABASE_URL to the disposable Vendor/Inventory database',
  );
  const parsed = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname));
  assert.equal(parsed.port, '55432');
  assert.equal(parsed.pathname, '/veninv_estimate_test');
  assert.equal(parsed.password, '');

  const redisModule = require('redis') as { createClient: (...args: any[]) => any };
  redisModule.createClient = () => ({
    on() {
      return this;
    },
    async connect() {},
    async quit() {},
    isReady: false,
  });

  const [
    { Source },
    { ServiceTicket, ServiceContext, JobType, ServiceTicketStatus },
    { ServiceEstimateRevision },
    { ServiceController },
    consumer,
    { ServiceEstimate, ServiceEstimateStatus },
    { ServiceEstimateItem, ServiceEstimateItemSource },
    { ServiceTicketItem, ServiceItemSource },
    { InventoryReservation },
    { SparePart },
    { Branch },
  ] = await Promise.all([
    import('../src/config/db'),
    import('../src/entities/serviceTicketEntity'),
    import('../src/entities/serviceEstimateRevisionEntity'),
    import('../src/controllers/serviceController'),
    import('../src/events/consumers/billingServiceEstimateDecisionConsumer'),
    import('../src/entities/serviceEstimateEntity'),
    import('../src/entities/serviceEstimateItemEntity'),
    import('../src/entities/serviceTicketItemEntity'),
    import('../src/entities/inventoryReservationEntity'),
    import('../src/entities/sparePartEntity'),
    import('../src/entities/branchEntity'),
  ]);
  Source.setOptions({ url: databaseUrl, ssl: false, synchronize: true, dropSchema: true });
  await Source.initialize();
  try {
    await Source.query(`CREATE TABLE billing_decision_inbox (
      event_id UUID PRIMARY KEY, invoice_id UUID NOT NULL, service_ticket_id UUID NOT NULL,
      vendor_revision_id UUID NOT NULL, billing_revision INTEGER NOT NULL,
      outcome VARCHAR(24) NOT NULL, error TEXT, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ
    )`);
    await Source.query(`CREATE TABLE service_decision_notification_outbox (
      event_id UUID PRIMARY KEY, recipient_ids JSONB NOT NULL, payload JSONB NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      lease_until TIMESTAMPTZ, delivered_at TIMESTAMPTZ, last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    const ticketRepo = Source.getRepository(ServiceTicket);
    const ticket = await ticketRepo.save(
      ticketRepo.create({
        ticketNumber: `DEC-${randomUUID()}`,
        productBrand: 'Test',
        productModel: 'Test',
        productName: 'Test',
        serialNumber: randomUUID(),
        serviceContext: ServiceContext.CHARGEABLE,
        issueDescription: 'handoff integration',
        jobType: JobType.ONSITE,
        status: ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2,
        createdBy: randomUUID(),
        assignedTechnicianId: randomUUID(),
        branchId: randomUUID(),
        track: 'B',
      }),
    );
    const invoiceId = randomUUID();
    ticket.serviceQuotationId = invoiceId;
    await ticketRepo.save(ticket);
    const revisionRepo = Source.getRepository(ServiceEstimateRevision);
    const revision = await revisionRepo.save(
      revisionRepo.create({
        invoiceId,
        billingRevision: 3,
        submissionCorrelationId: randomUUID(),
        ticketId: ticket.id,
        version: 3,
        revisionNumber: 3,
        status: 'WAITING_ADDITIONAL_APPROVAL',
        itemsSnapshot: [],
        labourCost: 0,
        totalCost: 0,
        totalAmount: 0,
        discountApplied: 0,
        visitChargeAmount: 0,
      }),
    );
    const base = {
      eventId: randomUUID(),
      eventType: 'billing.service-estimate.finance-decision.v1' as const,
      occurredAt: new Date().toISOString(),
      invoiceId,
      serviceTicketId: ticket.id,
      vendorRevisionId: revision.id,
      billingRevision: 3,
      decision: 'REJECTED' as const,
      decidedBy: randomUUID(),
      decidedAt: new Date().toISOString(),
      reason: 'Correct quantity',
      invoiceStatus: 'FINANCE_REJECTED' as const,
      estimateValidUntil: null,
    };

    assert.equal(await consumer.applyBillingServiceEstimateDecision(base), 'APPLIED');
    assert.equal(await consumer.applyBillingServiceEstimateDecision(base), 'DUPLICATE');
    const rejected = await revisionRepo.findOneByOrFail({ id: revision.id });
    assert.equal(rejected.financeDecision, 'REJECTED');
    assert.equal(rejected.financeDecisionNote, 'Correct quantity');
    assert.equal(
      (
        await Source.query(
          `SELECT count(*)::int AS n FROM service_ticket_activities WHERE "ticketId"=$1`,
          [ticket.id],
        )
      )[0].n,
      1,
    );
    assert.equal(
      (
        await Source.query(
          `SELECT count(*)::int AS n FROM service_decision_notification_outbox WHERE event_id=$1`,
          [base.eventId],
        )
      )[0].n,
      1,
    );

    const mismatchEvent = { ...base, eventId: randomUUID(), billingRevision: 2 };
    assert.equal(await consumer.applyBillingServiceEstimateDecision(mismatchEvent), 'QUARANTINED');
    assert.equal(
      (
        await Source.query(`SELECT outcome FROM billing_decision_inbox WHERE event_id=$1`, [
          mismatchEvent.eventId,
        ])
      )[0].outcome,
      'QUARANTINED',
    );
    assert.equal(
      (
        await Source.query(
          `SELECT count(*)::int AS n FROM service_ticket_activities WHERE "ticketId"=$1`,
          [ticket.id],
        )
      )[0].n,
      1,
    );

    const newer = await revisionRepo.save(
      revisionRepo.create({
        invoiceId,
        billingRevision: 4,
        submissionCorrelationId: randomUUID(),
        ticketId: ticket.id,
        version: 4,
        revisionNumber: 4,
        status: 'WAITING_ADDITIONAL_APPROVAL',
        itemsSnapshot: [],
        labourCost: 0,
        totalCost: 0,
        totalAmount: 0,
        discountApplied: 0,
        visitChargeAmount: 0,
      }),
    );
    const newerTicket = await ticketRepo.findOneByOrFail({ id: ticket.id });
    newerTicket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2;
    await ticketRepo.save(newerTicket);
    const delayedOlder = { ...base, eventId: randomUUID(), occurredAt: new Date().toISOString() };
    assert.equal(await consumer.applyBillingServiceEstimateDecision(delayedOlder), 'DUPLICATE');
    assert.equal(
      (await ticketRepo.findOneByOrFail({ id: ticket.id })).status,
      ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2,
    );
    assert.equal((await revisionRepo.findOneByOrFail({ id: newer.id })).financeDecision, null);

    await t.test(
      'legacy linked records without an exact Billing revision are quarantined without association',
      async () => {
        const legacyInvoiceId = randomUUID();
        const legacy = await revisionRepo.save(
          revisionRepo.create({
            invoiceId: legacyInvoiceId,
            billingRevision: null,
            submissionCorrelationId: null,
            ticketId: ticket.id,
            version: 2,
            revisionNumber: 2,
            status: 'WAITING_ADDITIONAL_APPROVAL',
            itemsSnapshot: [],
            labourCost: 0,
            totalCost: 0,
            totalAmount: 0,
            discountApplied: 0,
            visitChargeAmount: 0,
          }),
        );
        const ambiguous = {
          ...base,
          eventId: randomUUID(),
          invoiceId: legacyInvoiceId,
          vendorRevisionId: legacy.id,
          billingRevision: 1,
        };
        assert.equal(await consumer.applyBillingServiceEstimateDecision(ambiguous), 'QUARANTINED');
        assert.equal((await revisionRepo.findOneByOrFail({ id: legacy.id })).financeDecision, null);
      },
    );

    await t.test('legacy decision callbacks refuse linked revision state changes', async () => {
      const controller = new ServiceController() as any;
      const invoke = async (handler: Function, req: any) => {
        let error: any;
        const res = {
          status() {
            return this;
          },
          json(value: any) {
            return value;
          },
        };
        await handler(req, res, (nextError: any) => {
          error = nextError;
        });
        return error;
      };
      const request = {
        params: { id: ticket.id, revisionId: newer.id },
        body: {
          reason: 'legacy reject',
          remarks: 'legacy reject',
          serviceQuotationId: randomUUID(),
          status: 'FINANCE_REJECTED',
        },
        user: { userId: randomUUID(), role: 'MANAGER', branchId: ticket.branchId },
      };
      assert.match(
        (await invoke(controller.financeApproved, request))?.message || '',
        /decision handoff/,
      );
      assert.match(
        (await invoke(controller.financeRejected, request))?.message || '',
        /decision handoff/,
      );
      assert.match(
        (await invoke(controller.patchQuotationLink, request))?.message || '',
        /decision handoff/,
      );
      assert.match(
        (await invoke(controller.approveRevisionFinance, request))?.message || '',
        /linked to a Billing quotation/,
      );
      assert.match(
        (await invoke(controller.rejectRevisionFinance, request))?.message || '',
        /linked to a Billing quotation/,
      );
      assert.equal(
        (await ticketRepo.findOneByOrFail({ id: ticket.id })).status,
        ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2,
      );
      assert.equal((await revisionRepo.findOneByOrFail({ id: newer.id })).financeDecision, null);

      {
        const ambiguousInvoiceId = randomUUID();
        const ambiguousTicket = await ticketRepo.save(
          ticketRepo.create({
            ticketNumber: `AMB-${randomUUID()}`,
            productBrand: 'Test',
            productModel: 'Test',
            productName: 'Test',
            serialNumber: randomUUID(),
            serviceContext: ServiceContext.CHARGEABLE,
            issueDescription: 'ambiguous link',
            jobType: JobType.ONSITE,
            status: ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2,
            createdBy: randomUUID(),
            assignedTechnicianId: randomUUID(),
            branchId: ticket.branchId,
            track: 'B',
            serviceQuotationId: ambiguousInvoiceId,
          }),
        );
        const ambiguousRevision = await revisionRepo.save(
          revisionRepo.create({
            invoiceId: ambiguousInvoiceId,
            billingRevision: null,
            submissionCorrelationId: null,
            ticketId: ambiguousTicket.id,
            version: 1,
            revisionNumber: 1,
            status: 'WAITING_ADDITIONAL_APPROVAL',
            itemsSnapshot: [],
            labourCost: 0,
            totalCost: 0,
            totalAmount: 0,
            discountApplied: 0,
            visitChargeAmount: 0,
          }),
        );
        const ambiguousRequest = {
          params: { id: ambiguousTicket.id, revisionId: ambiguousRevision.id },
          body: {
            reason: 'stale callback',
            remarks: 'stale callback',
            serviceQuotationId: randomUUID(),
            status: 'FINANCE_APPROVED',
          },
          user: { userId: randomUUID(), role: 'MANAGER', branchId: ticket.branchId },
        };
        assert.match(
          (await invoke(controller.patchQuotationLink, ambiguousRequest))?.message || '',
          /decision handoff/,
        );
        assert.match(
          (await invoke(controller.financeApproved, ambiguousRequest))?.message || '',
          /decision handoff/,
        );
        assert.match(
          (await invoke(controller.financeRejected, ambiguousRequest))?.message || '',
          /decision handoff/,
        );
        assert.equal(
          (await ticketRepo.findOneByOrFail({ id: ambiguousTicket.id })).status,
          ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2,
        );
        assert.equal(
          (await ticketRepo.findOneByOrFail({ id: ambiguousTicket.id })).serviceQuotationId,
          ambiguousInvoiceId,
        );
        assert.equal(
          (await revisionRepo.findOneByOrFail({ id: ambiguousRevision.id })).financeDecision,
          null,
        );
      }
    });

    const approvingEvent = {
      ...base,
      eventId: randomUUID(),
      vendorRevisionId: newer.id,
      billingRevision: 4,
      decision: 'APPROVED' as const,
      invoiceStatus: 'FINANCE_APPROVED' as const,
      reason: null,
    };
    await t.test(
      'consumer write failure rolls inbox, mirror, activity, and notification intent back before retry',
      async () => {
        await Source.query(
          `CREATE OR REPLACE FUNCTION fail_decision_activity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected activity failure'; END $$`,
        );
        await Source.query(
          `CREATE TRIGGER fail_decision_activity BEFORE INSERT ON service_ticket_activities FOR EACH ROW WHEN (NEW."ticketId"='${ticket.id}') EXECUTE FUNCTION fail_decision_activity()`,
        );
        await assert.rejects(consumer.applyBillingServiceEstimateDecision(approvingEvent));
        assert.equal((await revisionRepo.findOneByOrFail({ id: newer.id })).financeDecision, null);
        assert.equal(
          (await ticketRepo.findOneByOrFail({ id: ticket.id })).status,
          ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2,
        );
        assert.equal(
          (
            await Source.query(
              `SELECT count(*)::int AS n FROM billing_decision_inbox WHERE event_id=$1`,
              [approvingEvent.eventId],
            )
          )[0].n,
          0,
        );
        assert.equal(
          (
            await Source.query(
              `SELECT count(*)::int AS n FROM service_decision_notification_outbox WHERE event_id=$1`,
              [approvingEvent.eventId],
            )
          )[0].n,
          0,
        );
        await Source.query(`DROP TRIGGER fail_decision_activity ON service_ticket_activities`);
        await Source.query(`DROP FUNCTION fail_decision_activity()`);
        assert.equal(await consumer.applyBillingServiceEstimateDecision(approvingEvent), 'APPLIED');
        assert.equal(
          await consumer.applyBillingServiceEstimateDecision(approvingEvent),
          'DUPLICATE',
        );
      },
    );

    await t.test(
      'customer approval atomically activates one revision and reserves parts once',
      async () => {
        const branch = await Source.getRepository(Branch).save(
          Source.getRepository(Branch).create({
            name: 'Isolated',
            address: 'Test',
            location: 'Test',
            started_date: '2026-01-01',
          }),
        );
        const part = await Source.getRepository(SparePart).save(
          Source.getRepository(SparePart).create({
            sku: `IT-${randomUUID()}`,
            part_name: 'Test part',
            brand: 'Test',
            branch_id: branch.id,
            quantity: 5,
            reserved_quantity: 0,
            base_price: 10,
          }),
        );
        const baseline = await Source.getRepository(ServiceEstimate).save(
          Source.getRepository(ServiceEstimate).create({
            ticketId: ticket.id,
            status: ServiceEstimateStatus.CUSTOMER_APPROVED,
            version: 1,
            labourCost: 2,
            totalCost: 3,
          }),
        );
        newer.estimateId = baseline.id;
        newer.financeDecision = 'APPROVED';
        newer.status = 'FINANCE_APPROVED';
        await revisionRepo.save(newer);
        await Source.getRepository(ServiceTicket).update(
          { id: ticket.id },
          { status: ServiceTicketStatus.FINANCE_APPROVED_2 },
        );
        await Source.getRepository(ServiceEstimateItem).save(
          Source.getRepository(ServiceEstimateItem).create({
            revisionId: newer.id,
            itemSource: ServiceEstimateItemSource.SPARE_PART,
            sparePartId: part.id,
            partName: part.part_name,
            quantity: 2,
            unitPrice: 10,
            totalPrice: 20,
            isFree: false,
            isApproved: false,
            unitCost: 5,
            totalCost: 10,
          }),
        );
        await Source.getRepository(ServiceTicketItem).save(
          Source.getRepository(ServiceTicketItem).create({
            ticketId: ticket.id,
            itemSource: ServiceItemSource.CUSTOM,
            partName: 'old accepted baseline',
            quantity: 1,
          }),
        );
        const controller = new ServiceController() as any;
        const invoke = async () => {
          let error: any;
          const res = {
            status() {
              return this;
            },
            json(value: any) {
              return value;
            },
          };
          await controller.approveRevisionCustomer(
            { params: { revisionId: newer.id }, user: { userId: randomUUID() } },
            res,
            (nextError: any) => {
              error = nextError;
            },
          );
          if (error) throw error;
        };

        await Source.query(
          `CREATE OR REPLACE FUNCTION fail_reservation_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected reservation failure'; END $$`,
        );
        await Source.query(
          `CREATE TRIGGER fail_reservation_insert BEFORE INSERT ON inventory_reservations FOR EACH ROW WHEN (NEW."ticketId"='${ticket.id}') EXECUTE FUNCTION fail_reservation_insert()`,
        );
        await assert.rejects(invoke());
        assert.equal(
          Number((await Source.getRepository(SparePart).findOneByOrFail({ id: part.id })).quantity),
          5,
        );
        assert.equal(
          (await Source.getRepository(ServiceTicketItem).find({ where: { ticketId: ticket.id } }))
            .length,
          1,
        );
        assert.equal(
          (await revisionRepo.findOneByOrFail({ id: newer.id })).status,
          'FINANCE_APPROVED',
        );
        await Source.query(`DROP TRIGGER fail_reservation_insert ON inventory_reservations`);
        await Source.query(`DROP FUNCTION fail_reservation_insert()`);

        await invoke();
        await invoke();
        assert.equal(
          Number((await Source.getRepository(SparePart).findOneByOrFail({ id: part.id })).quantity),
          3,
        );
        assert.equal(
          Number(
            (await Source.getRepository(SparePart).findOneByOrFail({ id: part.id }))
              .reserved_quantity,
          ),
          2,
        );
        assert.equal(
          (
            await Source.getRepository(InventoryReservation).find({
              where: { ticketId: ticket.id, revisionId: newer.id },
            })
          ).length,
          1,
        );
        assert.equal(
          (await Source.getRepository(ServiceTicketItem).find({ where: { ticketId: ticket.id } }))
            .length,
          1,
        );
        assert.equal(
          (
            await Source.getRepository(ServiceEstimateItem).find({
              where: { estimateId: baseline.id },
            })
          ).length,
          1,
        );
        assert.equal(
          (
            await Source.query(
              `SELECT count(*)::int AS n FROM service_ticket_activities WHERE "ticketId"=$1 AND "activityType"='REVISION_CUSTOMER_APPROVED'`,
              [ticket.id],
            )
          )[0].n,
          1,
        );
      },
    );

    await t.test('schema entity keeps invoice_id nullable for both historical forms', async () => {
      const columns = await Source.query(
        `SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='service_estimate_revisions' AND column_name='invoice_id'`,
      );
      assert.equal(columns[0]?.is_nullable, 'YES');
      await Source.query(
        `CREATE TEMP TABLE historical_required_revision (invoice_id UUID NOT NULL)`,
      );
      await Source.query(`CREATE TEMP TABLE historical_nullable_revision (invoice_id UUID NULL)`);
      const retainedInvoiceId = randomUUID();
      await Source.query(`INSERT INTO historical_required_revision VALUES ($1)`, [
        retainedInvoiceId,
      ]);
      await Source.query(`INSERT INTO historical_nullable_revision VALUES (NULL)`);
      await Source.query(
        `ALTER TABLE historical_required_revision ALTER COLUMN invoice_id DROP NOT NULL`,
      );
      const history = await Source.query(
        `SELECT (SELECT is_nullable FROM information_schema.columns WHERE table_name='historical_required_revision' AND column_name='invoice_id') AS formerly_required, (SELECT is_nullable FROM information_schema.columns WHERE table_name='historical_nullable_revision' AND column_name='invoice_id') AS nullable, (SELECT invoice_id FROM historical_required_revision) AS retained`,
      );
      assert.equal(history[0].formerly_required, 'YES');
      assert.equal(history[0].nullable, 'YES');
      assert.equal(history[0].retained, retainedInvoiceId);
    });
  } finally {
    await Source.destroy();
  }
});
