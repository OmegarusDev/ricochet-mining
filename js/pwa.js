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

function syncAppFrame() {
  pinLayoutViewport();
  const app = document.getElementById('app');
  if (!app) {
    return;
  }
  const vv = window.visualViewport;
  const width = Math.max(1, Math.floor(vv ? vv.width : window.innerWidth));
  const height = Math.max(1, Math.floor(vv ? vv.height : window.innerHeight));
  const left = vv ? Math.round(vv.offsetLeft) : 0;
  const top = vv ? Math.round(vv.offsetTop) : 0;
  app.style.left = `${left}px`;
  app.style.top = `${top}px`;
  app.style.right = 'auto';
  app.style.bottom = 'auto';
  app.style.width = `${width}px`;
  app.style.height = `${height}px`;
}

function preventPagePinch(event) {
  if (!event.touches || event.touches.length < 2) {
    return;
  }
  const canvas = document.getElementById('game-canvas');
  if (canvas && event.target && canvas.contains(event.target)) {
    return;
  }
  event.preventDefault();
}

function lockLayoutViewport() {
  syncAppFrame();
  window.addEventListener('scroll', syncAppFrame, { passive: true });
  window.addEventListener('resize', syncAppFrame);
  window.addEventListener('focusin', syncAppFrame);
  window.visualViewport?.addEventListener('scroll', syncAppFrame, { passive: true });
  window.visualViewport?.addEventListener('resize', syncAppFrame);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncAppFrame();
    }
  });
  document.addEventListener('touchmove', preventPagePinch, { passive: false });
  document.addEventListener('gesturestart', (event) => event.preventDefault());
  document.addEventListener('gesturechange', (event) => event.preventDefault());
  document.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) {
        const canvas = document.getElementById('game-canvas');
        if (canvas && event.target && canvas.contains(event.target)) {
          return;
        }
        event.preventDefault();
      }
    },
    { passive: false }
  );
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
