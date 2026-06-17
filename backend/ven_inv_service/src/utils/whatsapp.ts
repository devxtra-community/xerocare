import { logger } from '../config/logger';

export const sendWhatsappMessage = async (to: string, body: string) => {
  try {
    // Log the message as a mock in core notification flow
    logger.info(`[WhatsApp Service] Sending message to ${to}`, { body });
    return { success: true };
  } catch (error) {
    logger.error(`[WhatsApp Service] Failed to send message to ${to}`, error);
    throw error;
  }
};
