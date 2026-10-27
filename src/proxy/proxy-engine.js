import http from "node:http";

export function proxyRequest(req, res, target, timeout = 5000) {
  const targetUrl = new URL(target);

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || 80,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host,
    },
  };

  const proxy = http.request(options, (upstreamRes) => {
    res.writeHead(
      upstreamRes.statusCode || 502,
      upstreamRes.headers
    );

    upstreamRes.pipe(res);
  });

  proxy.setTimeout(timeout, () => {
    const error = new Error("Upstream request timed out");

    proxy.destroy(error);

    if (!res.headersSent && !res.destroyed) {
      res.status(504).json({
        error: "Gateway Timeout",
        message: `Upstream did not respond within ${timeout}ms`,
      });
    }
  });

  proxy.on("error", (error) => {
    console.error("Upstream error:", error.message);

    if (!res.headersSent && !res.destroyed) {
      res.status(502).json({
        error: "Bad Gateway",
        message: "Unable to reach upstream service",
      });
    } else if (!res.destroyed) {
      res.destroy(error);
    }
  });

  req.pipe(proxy);
}