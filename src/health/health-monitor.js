
export function createHealthMonitor(
  targets,
  {
    path = "/health",
    interval = 5000,
    timeout = 2000,
    unhealthyThreshold = 2,
    healthyThreshold = 2,
  } = {},
) {
  const states = new Map(
    targets.map((target) => [
      target,
      { healthy: false, failures: 0, successes: 0 },
    ]),
  );

  let timer = null;
  let checking = false;
  let started = false;

  async function check(target, initial = false) {
    const state = states.get(target);
    const wasHealthy = state.healthy;

    try {
      const response = await fetch(new URL(path, target), {
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        throw new Error(`Health check returned ${response.status}`);
      }

      state.successes++;
      state.failures = 0;

      // Initial successful check makes the backend available immediately.
      if (initial || state.successes >= healthyThreshold) {
        state.healthy = true;
      }
    } catch (error) {
      state.failures++;
      state.successes = 0;

      if (state.failures >= unhealthyThreshold) {
        state.healthy = false;
      }
    }

    if (wasHealthy !== state.healthy) {
      console.log(
        `[Health] ${target} is now ${
          state.healthy ? "HEALTHY" : "UNHEALTHY"
        }`,
      );
    }
  }

  async function checkAll(initial = false) {
    // Prevent overlapping health-check rounds.
    if (checking) return;

    checking = true;

    try {
      await Promise.all(
        [...states.keys()].map((target) => check(target, initial)),
      );
    } finally {
      checking = false;
    }
  }

  async function start() {
    if (started) return;

    started = true;

    // Complete the first round before the gateway starts accepting traffic.
    await checkAll(true);

    timer = setInterval(() => {
      void checkAll();
    }, interval);

    timer.unref();
  }

  return {
    start,

    getHealthyTargets() {
      return [...states.entries()]
        .filter(([, state]) => state.healthy)
        .map(([target]) => target);
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      started = false;
    },

    checkAll,
  };
}
