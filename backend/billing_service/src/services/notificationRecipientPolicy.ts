/** Stable recipient selection for multi-audience business events. Role-specific
 * lists must be resolved for the event's branch before they reach this helper. */
export function uniqueNotificationRecipients(
  ...recipientGroups: Array<Array<string | null | undefined> | string | null | undefined>
): string[] {
  const ids = recipientGroups.flatMap((group) => (Array.isArray(group) ? group : [group]));
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export function personalNotificationRecipients(employeeId: string): string[] {
  return uniqueNotificationRecipients(employeeId);
}

export function branchBusinessNotificationRecipients(
  branchManagerId: string | null | undefined,
  relevantEmployeeIds: string[] = [],
): string[] {
  return uniqueNotificationRecipients(branchManagerId, relevantEmployeeIds);
}

export function actionRequiredNotificationRecipients(
  actionOwnerIds: string[],
  requesterId?: string | null,
): string[] {
  return uniqueNotificationRecipients(actionOwnerIds, requesterId);
}

export function managerSummaryRecipients(branchManagerId: string | null | undefined): string[] {
  return uniqueNotificationRecipients(branchManagerId);
}
