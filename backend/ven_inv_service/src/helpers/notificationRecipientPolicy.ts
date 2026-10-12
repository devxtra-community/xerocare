/** Remove missing and overlapping role recipients before publishing one event. */
export function uniqueNotificationRecipientIds(
  ...recipientGroups: Array<Array<string | null | undefined> | string | null | undefined>
): string[] {
  const ids = recipientGroups.flatMap((group) => (Array.isArray(group) ? group : [group]));
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

/** Recipients who need the assignment handoff; the prior technician is only
 * included when the assignment actually changes. */
export function serviceAssignmentRecipients(
  assignedTechnicianId: string | null | undefined,
  previousTechnicianId?: string | null,
): { assigned: string[]; previous: string[] } {
  const alreadyAssigned = Boolean(
    assignedTechnicianId && previousTechnicianId === assignedTechnicianId,
  );
  const assigned = alreadyAssigned ? [] : uniqueNotificationRecipientIds(assignedTechnicianId);
  const previous =
    previousTechnicianId && previousTechnicianId !== assignedTechnicianId
      ? uniqueNotificationRecipientIds(previousTechnicianId)
      : [];
  return { assigned, previous };
}

export function canReviewServiceEstimateBranch(
  role: string | undefined,
  userBranchId: string | undefined,
  ticketBranchId: string,
): boolean {
  return role === 'ADMIN' || userBranchId === ticketBranchId;
}

/** Ticket stakeholders for an estimate outcome. Optional manager visibility is
 * retained on the first estimate's approval path; all IDs are deduplicated. */
export function serviceEstimateDecisionRecipients(
  technicianId: string | null | undefined,
  ticketCreatorId: string | null | undefined,
  branchManagerId?: string | null,
): string[] {
  return uniqueNotificationRecipientIds(technicianId, ticketCreatorId, branchManagerId);
}
