
import express from "express";
import { proxyRequest } from "./proxy/proxy-engine.js";
import { createRoundRobinBalancer } from "./proxy/load-balancer.js";
import { routes } from "./config/routes.js";
import { createHealthMonitor } from "./health/health-monitor.js";
import { createRateLimitMiddleware } from "./rate-limiter/rate-limit.middleware.js";
import { authenticateJWT } from "./auth/auth.middleware.js";

const app = express();

const rateLimitMiddleware = createRateLimitMiddleware({
  limit: 5,
  windowMs: 10_000,
});

// Gateway health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "api-gateway",
  });
});

// Log incoming requests before route handlers.
app.use((req, res, next) => {
  console.log(
    `[Gateway] Incoming: ${req.method} ${req.originalUrl}`,
  );
  next();
});

export async function configureRoutes() {
  console.log(
    "[Gateway] Routes from config:",
    routes.map((route) => route.path),
  );

  for (const route of routes) {
    console.log(`[Gateway] Initializing route: ${route.path}`);

    const healthMonitor = createHealthMonitor(
      route.targets,
      route.healthCheck,
    );

    // Wait for initial health checks.
    await healthMonitor.start();

    const getHealthyTargets = () =>
      healthMonitor.getHealthyTargets();

    const getNextService = createRoundRobinBalancer(
      getHealthyTargets,
    );

    const middlewares = [rateLimitMiddleware];

    if (route.auth) {
      middlewares.push(authenticateJWT);
    }

    // Register each configured gateway route.
    app.use(route.path, ...middlewares, (req, res) => {
      console.log(
        `[Gateway] Matched: ${req.method} ${req.originalUrl}`,
      );

      const healthyTargets = getHealthyTargets();

      if (healthyTargets.length === 0) {
        return res.status(503).json({
          error: "Service Unavailable",
          message: "No healthy upstream services available",
        });
      }

      const target = getNextService();

      if (!target) {
        return res.status(503).json({
          error: "Service Unavailable",
          message: "No healthy upstream services available",
        });
      }

      const retryTargets = healthyTargets.filter(
        (service) => service !== target,
      );

      console.log(
        `[Gateway] Forwarding ${req.method} ${req.originalUrl} -> ${target}`,
      );

      proxyRequest(
        req,
        res,
        target,
        route.timeout,
        retryTargets,
      );
    });

    console.log(`[Gateway] Registered route: ${route.path}`);
  }

  // IMPORTANT: Register the 404 handler only after all routes.
  app.use((req, res) => {
    console.log(
      `[Gateway] No route matched: ${req.method} ${req.originalUrl}`,
    );

    res.status(404).json({
      error: "Not Found",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  });
}

export default app;
