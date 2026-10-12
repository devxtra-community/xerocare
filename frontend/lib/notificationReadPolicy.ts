export type NotificationInteraction = 'header-preview' | 'detail-open' | 'navigate';

/** Opening a notification detail is the explicit read action; preview/navigation alone are not. */
export function shouldMarkNotificationRead(interaction: NotificationInteraction): boolean {
  return interaction === 'detail-open';
}
