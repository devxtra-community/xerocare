import { logger } from '../config/logger';

/**
 * Generic WhatsApp sending utility.
 * In production, this would integrate with Twilio, Meta Graph API, or a third-party gateway.
 * For now, we log the message as part of the core notification flow.
 */
export const sendWhatsappMessage = async (to: string, body: string) => {
  try {
    // 🔹 MOCK: Replace with real WhatsApp API call (Twilio, 360dialog, etc.)
    logger.info(`[WhatsApp Service] Sending message to ${to}`, { body });

    // Example Twilio integration placeholder:
    // await twilioClient.messages.create({ from: 'whatsapp:+...', to: `whatsapp:${to}`, body });

    return { success: true };
  } catch (error) {
    logger.error(`[WhatsApp Service] Failed to send message to ${to}`, error);
    throw error;
  }
};
