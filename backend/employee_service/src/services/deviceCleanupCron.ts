import cron from 'node-cron';
import { Source } from '../config/dataSource';
import { logger } from '../config/logger';

/**
 * Daily sweep of expired trusted-device rows. The 1-day cookie itself already
 * stops the browser from sending an expired token, but the DB row would
 * otherwise accumulate forever.
 */
export function startDeviceCleanupCron() {
  cron.schedule('0 2 * * *', async () => {
    try {
      await Source.query(`DELETE FROM trusted_devices WHERE expires_at < NOW()`);
      logger.info('Cleaned up expired trusted devices');
    } catch (err) {
      logger.error('Failed to clean up expired trusted devices:', err);
    }
  });
}
