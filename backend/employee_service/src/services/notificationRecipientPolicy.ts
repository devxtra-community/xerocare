/** Recipient lists for Employee Service notifications. Personal events intentionally
 * resolve only to the subject; branch managers are included only on business events. */
export function uniqueNotificationRecipients(...ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export function leaveSubmittedRecipients(managerId: string | null, hrIds: string[]): string[] {
  return uniqueNotificationRecipients(managerId, ...hrIds);
}

export function lateMarkRecipients(employeeId: string, hrIds: string[]): string[] {
  return uniqueNotificationRecipients(employeeId, ...hrIds);
}

export function personalNotificationRecipients(employeeId: string): string[] {
  return uniqueNotificationRecipients(employeeId);
}

export function personalNotificationRecipient(employeeId: string): string {
  return employeeId;
}

export function managerTargetSummaryRecipients(managerId: string | null): string[] {
  return uniqueNotificationRecipients(managerId);
}
