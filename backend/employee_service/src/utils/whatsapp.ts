import { logger } from '../config/logger';

/**
 * Generic WhatsApp sending utility backed by the WhatsApp Business Cloud API.
 *
 * This used to be a mock that logged the message and returned `{ success: true }`.
 * Every caller upstream — contract signing links, bill links, quotation links — then
 * reported "sent" to staff while the customer's phone never buzzed, which is the worst
 * possible failure mode for a delivery channel: it is silent, and the confirmation the
 * employee sees is a lie. A delivery channel that cannot deliver must fail, so an
 * unconfigured or rejecting provider now throws instead of pretending.
 *
 * Configuration (documented in docs/XEROCARE_COMPLETE_DOCUMENTATION.md §19):
 *   WHATSAPP_API_URL  — full message endpoint, e.g.
 *                       https://graph.facebook.com/v20.0/<phone_number_id>/messages
 *   WHATSAPP_API_TOKEN — the system-user / access token for that WABA account
 */
export const sendWhatsappMessage = async (to: string, body: string) => {
  const apiUrl = process.env.WHATSAPP_API_URL?.trim();
  const apiToken = process.env.WHATSAPP_API_TOKEN?.trim();

  if (!apiUrl || !apiToken) {
    throw new Error(
      'WhatsApp delivery is not configured: WHATSAPP_API_URL and WHATSAPP_API_TOKEN must both be set. ' +
        'The message was NOT sent.',
    );
  }

  // Meta expects the recipient in international format without a leading "+".
  const recipient = to.replace(/[^\d]/g, '');
  if (!recipient) {
    throw new Error(
      `WhatsApp recipient "${to}" contains no dialable number — message was NOT sent.`,
    );
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { preview_url: true, body },
    }),
  });

  if (!response.ok) {
    // Include the provider's own error body — "it failed" is useless when the
    // customer is waiting for a link and someone has to work out why.
    const detail = await response.text().catch(() => '');
    logger.error(`[WhatsApp Service] Provider rejected message to ${to}`, {
      status: response.status,
      detail,
    });
    throw new Error(
      `WhatsApp provider responded ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    );
  }

  logger.info(`[WhatsApp Service] Sent message to ${recipient}`);
  return { success: true };
};
