import { Redis } from "ioredis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    redisClient.on("error", (err) => {
      console.error("Redis error:", err);
    });
  }
  return redisClient;
}

export default getRedis;
