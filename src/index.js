import express from "express";
import { proxyRequest } from "./proxy/proxy-engine.js";
import { createRoundRobinBalancer } from "./proxy/load-balancer.js";
import { routes } from "./config/routes.js";
import { createHealthMonitor } from "./health/health-monitor.js";
import { createRateLimitMiddleware } from "./rate-limiter/rate-limit.middleware.js";

const app = express();
const PORT = 4000;

// Create ONE shared rate limiter for all API routes
const rateLimitMiddleware = createRateLimitMiddleware({
  limit: 5,
  windowMs: 10_000,
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "api-gateway",
  });
});

async function startGateway() {
  for (const route of routes) {
    const healthMonitor = createHealthMonitor(route.targets, route.healthCheck);

    // Wait for initial health checks, if supported
    if (typeof healthMonitor.start === "function") {
      await healthMonitor.start();
    }

    const getNextService = createRoundRobinBalancer(() =>
      healthMonitor.getHealthyTargets(),
    );

    // Reuse the SAME rate limiter for every route
    app.use(route.path, rateLimitMiddleware, (req, res) => {
      const target = getNextService();

      if (!target) {
        return res.status(503).json({
          error: "Service Unavailable",
          message: "No healthy upstream services available",
        });
      }

      console.log(`Forwarding ${req.method} ${req.originalUrl} -> ${target}`);

      proxyRequest(req, res, target, route.timeout);
    });
  }

  app.listen(PORT, () => {
    console.log(`API Gateway running at http://localhost:${PORT}`);
  });
}

startGateway().catch((error) => {
  console.error("Failed to start API Gateway:", error);
  process.exitCode = 1;
});
