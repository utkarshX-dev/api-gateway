export function createHealthMonitor(
  targets,
  {
    path = "/health",
    interval = 5000,
    timeout = 2000,
    unhealthyThreshold = 2,
    healthyThreshold = 2,
  } = {}
) {
  const states = new Map(
    targets.map((target) => [
      target,
      { healthy: true, failures: 0, successes: 0 },
    ])
  );

  async function check(target) {
    const state = states.get(target);

    try {
      const response = await fetch(new URL(path, target), {
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        throw new Error(`Health check returned ${response.status}`);
      }

      state.successes++;
      state.failures = 0;

      if (state.successes >= healthyThreshold) {
        state.healthy = true;
      }
    } catch {
      state.failures++;
      state.successes = 0;

      if (state.failures >= unhealthyThreshold) {
        state.healthy = false;
      }
    }
  }

  async function checkAll() {
    await Promise.all([...states.keys()].map(check));
  }

  void checkAll();

  const timer = setInterval(() => {
    void checkAll();
  }, interval);

  timer.unref();

  return {
    getHealthyTargets() {
      return [...states.entries()]
        .filter(([, state]) => state.healthy)
        .map(([target]) => target);
    },

    stop() {
      clearInterval(timer);
    },

    checkAll,
  };
}