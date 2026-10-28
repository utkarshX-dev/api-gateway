
import { createSlidingWindowLog } from "./sliding-window-log.js";

export function createRateLimitMiddleware({
  limit = 5,
  windowMs = 10_000,
  keyPrefix = "api-gateway:rate-limit",
} = {}) {
  const limiter = createSlidingWindowLog({
    limit,
    windowMs,
    keyPrefix,
  });

  return async function rateLimitMiddleware(req, res, next) {
    try {
      const result = await limiter.consume(req.ip);

      res.setHeader("RateLimit-Limit", String(result.limit));
      res.setHeader("RateLimit-Remaining", String(result.remaining));

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil(
          result.retryAfterMs / 1000,
        );

        res.setHeader("Retry-After", String(retryAfterSeconds));

        return res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Try again later.",
          retryAfterSeconds,
        });
      }

      return next();
    } catch (error) {
      console.error("[RateLimiter] Redis operation failed:", error.message);

      if (res.headersSent) {
        return next(error);
      }

      return res.status(503).json({
        error: "Service Unavailable",
        message: "Rate limiting service is temporarily unavailable.",
      });
    }
  };
}
