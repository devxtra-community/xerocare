export interface ServiceNotificationReference {
  referenceId?: unknown;
  referenceType?: unknown;
  estimateId?: unknown;
  revisionId?: unknown;
}

export interface NotificationTarget {
  path: string;
  label: string;
}

const SERVICE_LIST: Record<string, string | null> = {
  admin: '/admin/service',
  employee: '/employee/service',
  manager: '/employee/service',
  finance: '/finance/service-estimates',
  hr: null,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validId(value: unknown): string | null {
  return typeof value === 'string' && UUID.test(value) ? value : null;
}

/** Service notification links only select records already returned by the user's authorized feed. */
export function resolveServiceNotificationTarget(
  reference: ServiceNotificationReference,
  role: string,
): NotificationTarget | null {
  const path = SERVICE_LIST[role.toLowerCase()];
  if (!path) return null;

  const ticketId = validId(reference.referenceId);
  if (!ticketId) return { path, label: 'Go to service tickets' };

  const hasEstimateReference = reference.estimateId !== undefined && reference.estimateId !== null;
  const hasRevisionReference = reference.revisionId !== undefined && reference.revisionId !== null;
  const estimateId = validId(reference.estimateId);
  const revisionId = validId(reference.revisionId);
  if (
    (hasEstimateReference && !estimateId) ||
    (hasRevisionReference && !revisionId) ||
    (estimateId && revisionId)
  ) {
    return { path, label: 'Go to service tickets' };
  }

  const params = new URLSearchParams({ ticketId });
  if (estimateId) params.set('estimateId', estimateId);
  if (revisionId) params.set('revisionId', revisionId);
  return { path: `${path}?${params.toString()}`, label: 'Open service ticket' };
}
