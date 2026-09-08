import { Source } from '../config/db';
import { ServiceTicket, ServiceTicketStatus } from '../entities/serviceTicketEntity';
import { ServiceEstimate, ServiceEstimateStatus } from '../entities/serviceEstimateEntity';
import { Rfq, RfqStatus } from '../entities/rfqEntity';
import { StockTransfer, TransferStatus } from '../entities/stockTransferEntity';
import { logger } from '../config/logger';

/**
 * Sidebar badge counts owned by this service.
 *
 * Keys are namespaced by what they queue for, not by role — see the billing service's
 * navCountsService for the reasoning. Anything without a genuine "waiting for someone"
 * state (catalogue pages, warehouses, vendors) deliberately gets no key.
 */
export async function getInventoryNavCounts(
  branchId: string,
  role: string,
): Promise<Record<string, number>> {
  const ticketRepo = Source.getRepository(ServiceTicket);
  const estimateRepo = Source.getRepository(ServiceEstimate);
  const rfqRepo = Source.getRepository(Rfq);
  const transferRepo = Source.getRepository(StockTransfer);

  // Stock transfers queue for two different branches depending on status: the giving
  // branch approves a SENT request, the receiving branch receives an IN_TRANSIT one.
  // Mirrors stockTransferService.getPendingCount so the dot and the page's own pending
  // count can never disagree.
  const transferQb = transferRepo.createQueryBuilder('t');
  if (role === 'ADMIN') {
    transferQb.where('t.status IN (:...statuses)', {
      statuses: [TransferStatus.SENT, TransferStatus.IN_TRANSIT],
    });
  } else {
    transferQb.where(
      `(
        (t.source_branch_id = :bid AND t.status = :sent) OR
        (t.destination_branch_id = :bid AND t.status = :transit)
      )`,
      { bid: branchId, sent: TransferStatus.SENT, transit: TransferStatus.IN_TRANSIT },
    );
  }

  const [tickets, estimates, rfqs, transfers] = await Promise.all([
    // Raised but not yet picked up by anyone.
    ticketRepo
      .createQueryBuilder('t')
      .where('t.branchId = :branchId', { branchId })
      .andWhere('t.status = :status', { status: ServiceTicketStatus.OPEN })
      .getCount(),

    // Estimates sitting in Finance's approval queue. Branch comes from the parent ticket
    // — an estimate has no branch column of its own.
    estimateRepo
      .createQueryBuilder('e')
      .innerJoin(ServiceTicket, 't', 't.id = e."ticketId"')
      .where('t.branchId = :branchId', { branchId })
      .andWhere('e.status IN (:...statuses)', {
        statuses: [
          ServiceEstimateStatus.WAITING_FINANCE_APPROVAL,
          ServiceEstimateStatus.WAITING_ADDITIONAL_APPROVAL,
        ],
      })
      .getCount(),

    // Out with vendors and carrying quotes that nobody has awarded yet.
    rfqRepo
      .createQueryBuilder('r')
      .where('r.branch_id = :branchId', { branchId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [RfqStatus.SENT, RfqStatus.PARTIAL_QUOTED, RfqStatus.FULLY_QUOTED],
      })
      .getCount(),

    transferQb.getCount(),
  ]);

  const counts = {
    SERVICE_TICKETS: tickets,
    SERVICE_ESTIMATES: estimates,
    RFQS: rfqs,
    STOCK_TRANSFERS: transfers,
  };
  logger.debug?.('navCounts(inventory)', { branchId, counts });
  return counts;
}
