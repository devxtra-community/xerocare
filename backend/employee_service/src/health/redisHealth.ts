import { redis } from "../config/redis";

export const checkRedis = async () => {
  try {
    const result = await redis.ping();

    if (result !== "PONG") {
      throw new Error("Unexpected Redis response");
    }

    return {
      status: "UP",
    };
  } catch (error: any) {
    return {
      status: "DOWN",
      error: error.message,
    };
  }
};
