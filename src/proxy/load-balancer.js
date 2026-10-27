export function createRoundRobinBalancer(getTargets) {
  let currentIndex = 0;

  return function getNextService() {
    const services = getTargets();

    if (services.length === 0) {
      return null;
    }

    currentIndex %= services.length;

    const service = services[currentIndex];

    currentIndex = (currentIndex + 1) % services.length;

    return service;
  };
}