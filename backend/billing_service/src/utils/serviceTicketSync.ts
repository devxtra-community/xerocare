import { logger } from '../config/logger';

/**
 * Tells the inventory service what Accounts decided about a service visit charge.
 *
 * The ticket lives in ven_inv but the approval happens here, so without this the desk
 * would show "awaiting approval" forever after Accounts had already signed it off. The
 * call is deliberately best-effort and never throws: the money has already been posted
 * inside a committed transaction by the time we get here, and failing the approval
 * response because a status mirror could not be delivered would leave Accounts believing
 * their approval did not happen while the cash had in fact moved.
 *
 * The ticket's own status is a mirror, not the source of truth — the SalePaymentRequest
 * is. A reconcile on read (see the service page's ticket loader) closes any gap left by a
 * delivery that failed here.
 */
export async function syncVisitChargeDecision(params: {
  serviceTicketId: string;
  status: 'COLLECTED' | 'REJECTED';
  paymentRequestId: string;
  rejectionReason?: string | null;
}): Promise<void> {
  try {
    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const base = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `${base}/service/tickets/${params.serviceTicketId}/visit-charge-decision`,
      {
        method: 'PATCH',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-internal-service': 'billing',
        },
        body: JSON.stringify({
          status: params.status,
          paymentRequestId: params.paymentRequestId,
          rejectionReason: params.rejectionReason ?? null,
        }),
      },
    );
    clearTimeout(timer);
    if (!res.ok) {
      logger.warn(
        `Visit charge decision not mirrored to ticket ${params.serviceTicketId}: HTTP ${res.status}`,
      );
    }
  } catch (err) {
    logger.warn(
      `Visit charge decision not mirrored to ticket ${params.serviceTicketId}: ${(err as Error).message}`,
    );
  }
}
