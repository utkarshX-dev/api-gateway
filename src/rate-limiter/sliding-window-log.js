export function createSlidingWindowLog({ limit = 5, windowMs = 10_000 } = {}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer");
  }

  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("windowMs must be a positive number");
  }

  const requestLogs = new Map();

  function consume(clientId, now = Date.now()) {
    if (!clientId) {
      throw new Error("clientId is required");
    }

    const windowStart = now - windowMs;

    // Client ke existing request timestamps nikalo.
    const timestamps = requestLogs.get(clientId) ?? [];

    // Sliding window se expired timestamps remove karo.
    const recentTimestamps = timestamps.filter(
      (timestamp) => timestamp > windowStart,
    );

    // Limit already reach ho chuki hai toh reject karo.
    if (recentTimestamps.length >= limit) {
      requestLogs.set(clientId, recentTimestamps);

      const retryAfterMs = recentTimestamps[0] + windowMs - now;

      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterMs: Math.max(0, retryAfterMs),
      };
    }

    // Allowed request ka timestamp record karo.
    recentTimestamps.push(now);
    requestLogs.set(clientId, recentTimestamps);

    return {
      allowed: true,
      limit,
      remaining: limit - recentTimestamps.length,
      retryAfterMs: 0,
    };
  }

  return { consume };
}
