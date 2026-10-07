/** Remove missing and overlapping role recipients before publishing one event. */
export function uniqueNotificationRecipientIds(
  ...recipientGroups: Array<Array<string | null | undefined> | string | null | undefined>
): string[] {
  const ids = recipientGroups.flatMap((group) => (Array.isArray(group) ? group : [group]));
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}
