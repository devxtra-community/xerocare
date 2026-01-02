import { checkDatabase } from "./dbHealth";
import { checkRedis } from "./redisHealth";

export const healthCheck = async () => {
  const [db, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const isHealthy =
    db.status === "UP" &&
    redis.status === "UP";

  return {
    status: isHealthy ? "UP" : "DEGRADED",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: db,
      redis,
    },
  };
};
