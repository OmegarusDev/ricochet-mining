/**
 * Installable PWA / Android Chrome WebAPK.
 *
 * Installed launches use the manifest display mode (fullscreen). Do not
 * request the HTML Fullscreen API on top of that — on Android it brings
 * the status bar back.
 */

export function isDisplayFullscreen() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return (
    isDisplayFullscreen() ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    Boolean(window.navigator.standalone)
  );
}

function isLocalHost() {
  const host = location.hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

function pinLayoutViewport() {
  if (window.scrollX || window.scrollY) {
    window.scrollTo(0, 0);
  }
  if (document.documentElement.scrollTop) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body.scrollTop) {
    document.body.scrollTop = 0;
  }
}

function lockLayoutViewport() {
  pinLayoutViewport();
  window.addEventListener('scroll', pinLayoutViewport, { passive: true });
  window.addEventListener('focusin', pinLayoutViewport);
  window.visualViewport?.addEventListener('scroll', pinLayoutViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', pinLayoutViewport, { passive: true });
}

export function registerPwa() {
  lockLayoutViewport();

  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (isLocalHost()) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((reg) => reg.unregister());
      })
      .catch(() => {});
    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => {
          keys
            .filter((key) => key.startsWith('ricochet-'))
            .forEach((key) => caches.delete(key));
        })
        .catch(() => {});
    }
    return;
  }

  const start = () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './', updateViaCache: 'none' })
      .then((registration) => {
        try {
          registration.update();
        } catch (err) {
          /* ignore */
        }
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            registration.update().catch(() => {});
          }
        });
      })
      .catch((err) => {
        console.warn('Service worker registration failed.', err);
      });
  };

  if (document.readyState === 'complete') {
    setTimeout(start, 400);
  } else {
    window.addEventListener('load', () => setTimeout(start, 400));
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) {
      return;
    }
    refreshing = true;
    location.reload();
  });
}
