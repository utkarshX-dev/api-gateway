import { createSlidingWindowLog } from "./sliding-window-log.js";

export function createRateLimitMiddleware({
  limit = 5,
  windowMs = 10_000,
} = {}) {
  const limiter = createSlidingWindowLog({
    limit,
    windowMs,
  });

  return function rateLimitMiddleware(req, res, next) {
    // Client ko uske IP address se identify karo.
    const clientId = req.ip;

    const result = limiter.consume(clientId);

    // Rate-limit information response headers mein bhejo.
    res.setHeader("RateLimit-Limit", result.limit);
    res.setHeader("RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      const retryAfterSeconds = Math.ceil(
        result.retryAfterMs / 1000
      );

      res.setHeader("Retry-After", retryAfterSeconds);

      return res.status(429).json({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Try again later.",
        retryAfterSeconds,
      });
    }

    // Allowed request ko next middleware tak bhejo.
    next();
  };
}