export interface NotificationInsertManager {
  query<T = unknown>(sql: string, parameters?: unknown[]): Promise<T>;
}

export interface InAppNotificationRecord {
  title: string;
  message: string;
  type?: string;
  data?: Record<string, unknown> | null;
}

/**
 * Insert one notification per recipient as one atomic PostgreSQL statement.
 * The unique event/recipient index makes redelivery and concurrent duplicate
 * consumption harmless while keeping each recipient's unread row independent.
 */
export async function persistInAppNotifications(
  manager: NotificationInsertManager,
  eventId: string,
  recipientIds: string[],
  notification: InAppNotificationRecord,
): Promise<void> {
  const recipients = [...new Set(recipientIds.filter((id) => typeof id === 'string' && id.trim()))];
  if (recipients.length === 0) return;

  await manager.query(
    `INSERT INTO notifications
       (employee_id, title, message, type, data, is_read, event_id)
     SELECT recipients.employee_id, $3, $4, $5, $6::jsonb, false, $2
       FROM unnest($1::varchar[]) AS recipients(employee_id)
     ON CONFLICT DO NOTHING`,
    [
      recipients,
      eventId,
      notification.title,
      notification.message,
      notification.type || 'INFO',
      notification.data == null ? null : JSON.stringify(notification.data),
    ],
  );
}
