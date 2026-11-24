const checkInterval = 5 * 60_000;
const activationTimeout = 10_000;
const activateMessage = 'FISH_ISLAND_ACTIVATE_UPDATE';

const listeners = new Set<() => void>();
let availableUpdate: ServiceWorker | null = null;

export function getPwaUpdate() {
  return availableUpdate;
}

export function subscribePwaUpdate(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function watchRegistration(
  registration: ServiceWorkerRegistration,
  serviceWorkers: ServiceWorkerContainer,
  initialController: ServiceWorker | null,
) {
  let pageController = initialController;
  let checking = false;

  function announceUpdate() {
    const controller = serviceWorkers.controller;
    // The first install claims this page too. That alone does not require a refresh.
    pageController ??= controller;
    const update = controller
      ? (registration.waiting ?? (controller === pageController ? null : controller))
      : null;
    if (update === availableUpdate) return;
    availableUpdate = update;
    listeners.forEach((listener) => listener());
  }

  function watchInstalling() {
    const worker = registration.installing;
    if (!worker) return;
    const onStateChange = () => {
      if (worker.state !== 'installed' && worker.state !== 'redundant') return;
      worker.removeEventListener('statechange', onStateChange);
      announceUpdate();
    };
    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  }

  async function checkForUpdate() {
    if (checking || document.visibilityState !== 'visible' || !navigator.onLine) return;
    checking = true;
    try {
      await registration.update();
    } catch {
      // Keep the current page usable when the update endpoint is unavailable.
    } finally {
      checking = false;
    }
  }

  registration.addEventListener('updatefound', watchInstalling);
  serviceWorkers.addEventListener('controllerchange', announceUpdate);
  document.addEventListener('visibilitychange', checkForUpdate);
  window.addEventListener('online', checkForUpdate);
  window.setInterval(checkForUpdate, checkInterval);
  watchInstalling();
  announceUpdate();
  void checkForUpdate();
}

/** Register once outside React: appearance changes cannot restart the worker lifecycle. */
export function registerPwa() {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  const serviceWorkers = navigator.serviceWorker;
  const initialController = serviceWorkers.controller;
  const register = () => {
    void serviceWorkers.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(
      (registration) => watchRegistration(registration, serviceWorkers, initialController),
      () => console.warn('离线外壳注册失败，应用仍可联网使用。'),
    );
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export function activatePwaUpdate(worker: ServiceWorker): Promise<void> {
  const serviceWorkers = navigator.serviceWorker;
  if (serviceWorkers.controller === worker) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => finish(false), activationTimeout);

    function finish(activated: boolean) {
      window.clearTimeout(timer);
      serviceWorkers.removeEventListener('controllerchange', onControllerChange);
      worker.removeEventListener('statechange', onStateChange);
      if (activated) resolve();
      else reject(new Error('新版未接管当前页面'));
    }

    function onControllerChange() {
      if (serviceWorkers.controller === worker) finish(true);
    }

    function onStateChange() {
      if (worker.state === 'redundant') finish(false);
    }

    serviceWorkers.addEventListener('controllerchange', onControllerChange);
    worker.addEventListener('statechange', onStateChange);
    try {
      worker.postMessage(activateMessage);
    } catch {
      finish(false);
    }
  });
}
