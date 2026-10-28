
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy(retries) {
      if (retries >= 10) {
        return new Error("Redis reconnect limit exceeded");
      }

      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (error) => {
  console.error("[Redis] Client error:", error.message);
});

redisClient.on("connect", () => {
  console.log("[Redis] Connecting...");
});

redisClient.on("ready", () => {
  console.log("[Redis] Connected and ready");
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  await redisClient.ping();
  console.log("[Redis] PING successful");
}

export async function disconnectRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit();
    console.log("[Redis] Connection closed");
  }
}
