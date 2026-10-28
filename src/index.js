
import app, { configureRoutes } from "./app.js";
import {
  connectRedis,
  disconnectRedis,
} from "./config/redis.js";

const PORT = 4000;

let server;
let shuttingDown = false;

async function startGateway() {
  await connectRedis();
  await configureRoutes();

  server = app.listen(PORT, () => {
    console.log(`API Gateway running at http://localhost:${PORT}`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[Gateway] ${signal} received. Shutting down...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }

    await disconnectRedis();
    process.exitCode = 0;
  } catch (error) {
    console.error("[Gateway] Shutdown failed:", error);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

startGateway().catch(async (error) => {
  console.error("[Gateway] Failed to start:", error);

  try {
    await disconnectRedis();
  } catch (shutdownError) {
    console.error("[Gateway] Redis cleanup failed:", shutdownError);
  }

  process.exitCode = 1;
});
