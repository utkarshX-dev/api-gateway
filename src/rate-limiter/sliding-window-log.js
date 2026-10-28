
import { randomUUID } from "node:crypto";
import { redisClient } from "../config/redis.js";

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

local windowStart = now - windowMs

redis.call("ZREMRANGEBYSCORE", key, "-inf", windowStart)

local count = redis.call("ZCARD", key)

if count >= limit then
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  local retryAfterMs = 0

  if oldest[2] then
    retryAfterMs = tonumber(oldest[2]) + windowMs - now
  end

  return {0, 0, math.max(0, retryAfterMs)}
end

redis.call("ZADD", key, now, member)
redis.call("PEXPIRE", key, windowMs)

local newCount = count + 1
local remaining = limit - newCount

return {1, remaining, 0}
`;

export function createSlidingWindowLog({
  limit = 5,
  windowMs = 10_000,
  keyPrefix = "api-gateway:rate-limit",
} = {}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer");
  }

  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("windowMs must be a positive number");
  }

  if (!keyPrefix) {
    throw new Error("keyPrefix is required");
  }

  async function consume(clientId, now = Date.now()) {
    if (!clientId) {
      throw new Error("clientId is required");
    }

    if (!Number.isFinite(now)) {
      throw new Error("now must be a finite number");
    }

    if (!redisClient.isReady) {
      throw new Error("Redis is not connected or ready");
    }

    const key = `${keyPrefix}:${clientId}`;
    const member = `${now}:${randomUUID()}`;

    const result = await redisClient.eval(SLIDING_WINDOW_SCRIPT, {
      keys: [key],
      arguments: [
        String(now),
        String(windowMs),
        String(limit),
        member,
      ],
    });

    const [allowed, remaining, retryAfterMs] = result;

    return {
      allowed: Number(allowed) === 1,
      limit,
      remaining: Number(remaining),
      retryAfterMs: Number(retryAfterMs),
    };
  }

  return { consume };
}
