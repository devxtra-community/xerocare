import { checkDatabase } from './dbHealth';

export const healthCheck = async () => {
  const [db] = await Promise.all([checkDatabase()]);

  const isHealthy = db.status === 'UP';

  return {
    status: isHealthy ? 'UP' : 'DEGRADED',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: db,
    },
  };
};
