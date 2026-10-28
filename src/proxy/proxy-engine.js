
import http from "node:http";

const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxyRequest(
  req,
  res,
  target,
  timeout = 5000,
  retryTargets = [],
) {
  const targets = [...new Set([target, ...retryTargets])];
  const canRetry = RETRYABLE_METHODS.has(req.method.toUpperCase());

  let attempt = 0;
  let finished = false;
  let timedOut = false;
  let responseStarted = false;
  let requestBody = [];

  // Buffer the incoming body once so each attempt can use the same bytes.
  req.on("data", (chunk) => requestBody.push(chunk));

  req.on("error", (error) => {
    console.error("Incoming request error:", error.message);

    if (!res.headersSent && !res.destroyed) {
      res.status(400).json({
        error: "Bad Request",
        message: "Unable to read incoming request",
      });
    }
  });

  req.on("end", () => {
    if (!finished) {
      attemptRequest(targets[attempt]);
    }
  });

  function attemptRequest(currentTarget) {
    if (finished || res.destroyed) return;

    const targetUrl = new URL(currentTarget);

    const headers = {
      ...req.headers,
      host: targetUrl.host,
    };

    // Remove client-supplied identity claims.
    delete headers["x-user-id"];
    delete headers["x-user-role"];

    // Forward only identity from verified JWT payload.
    if (req.auth) {
      if (req.auth.userId !== undefined) {
        headers["x-user-id"] = String(req.auth.userId);
      }

      if (req.auth.role !== undefined) {
        headers["x-user-role"] = String(req.auth.role);
      }
    }

    // The buffered body may have a different length from the original
    // headers, so recalculate Content-Length.
    if (req.headers["content-length"] !== undefined) {
      headers["content-length"] = Buffer
        .concat(requestBody)
        .length
        .toString();
    }

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 80,
      path: req.originalUrl,
      method: req.method,
      headers,
    };

    timedOut = false;
    responseStarted = false;

    console.log(
      `Proxy attempt ${attempt + 1}/${targets.length}: ${currentTarget}`,
    );

    const proxy = http.request(options, (upstreamRes) => {
      responseStarted = true;
      finished = true;

      res.writeHead(
        upstreamRes.statusCode || 502,
        upstreamRes.headers,
      );

      upstreamRes.pipe(res);
    });

    proxy.setTimeout(timeout, () => {
      timedOut = true;

      const error = new Error("Upstream request timed out");
      error.code = "ETIMEDOUT";

      proxy.destroy(error);
    });

    proxy.on("error", (error) => {
      console.error(
        `Upstream error at ${currentTarget}:`,
        error.message,
      );

      if (
        finished ||
        responseStarted ||
        res.headersSent ||
        res.destroyed
      ) {
        return;
      }

      const hasAnotherTarget = attempt + 1 < targets.length;

      if (canRetry && hasAnotherTarget) {
        attempt++;

        console.log(`Retrying on ${targets[attempt]}`);
        attemptRequest(targets[attempt]);
        return;
      }

      finished = true;

      const isTimeout =
        timedOut || error.code === "ETIMEDOUT";

      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout ? "Gateway Timeout" : "Bad Gateway",
        message: isTimeout
          ? `Upstream did not respond within ${timeout}ms`
          : "Unable to reach upstream service",
      });
    });

    // Send the same buffered bytes for each attempt.
    proxy.end(Buffer.concat(requestBody));
  }

  // The request must finish buffering before the first upstream attempt.
}
