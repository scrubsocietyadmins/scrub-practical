/**
 * Scrub Practical - PWA Service Worker & Install Lifecycle Management
 * 
 * Provides:
 * - Service worker registration with GitHub Pages relative scope
 * - Online / Offline connectivity detection
 * - BeforeInstallPrompt capture for custom install button
 * - Safe update notifications that NEVER interrupt active exams
 */

export interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
}

type PWAStateListener = (state: PWAState) => void;

class PWAManager {
  private deferredPrompt: any = null;
  private waitingWorker: ServiceWorker | null = null;
  private listeners = new Set<PWAStateListener>();
  private state: PWAState = {
    isInstalled: false,
    canInstall: false,
    isOnline: typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
    updateAvailable: false,
  };

  constructor() {
    if (typeof window === 'undefined') return;

    // Detect standalone display mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    this.state.isInstalled = isStandalone;

    // Connectivity listeners
    window.addEventListener('online', () => {
      this.updateState({ isOnline: true });
    });

    window.addEventListener('offline', () => {
      this.updateState({ isOnline: false });
    });

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevent the default mini-infobar or browser banner
      e.preventDefault();
      this.deferredPrompt = e;
      this.updateState({ canInstall: true });
    });

    // Installed event
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.updateState({ isInstalled: true, canInstall: false });
    });
  }

  public registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    window.addEventListener('load', () => {
      // Register with relative path to support both root and subpath GitHub Pages deployments
      const swUrl = './sw.js';

      navigator.serviceWorker
        .register(swUrl, { scope: './' })
        .then((registration) => {
          // Check if an update is already waiting
          if (registration.waiting) {
            this.waitingWorker = registration.waiting;
            this.updateState({ updateAvailable: true });
          }

          // Listen for new worker installation
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (
                installingWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New update available in background
                this.waitingWorker = installingWorker;
                this.updateState({ updateAvailable: true });
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });

      // Reload page when new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  /**
   * Prompts the user to install the application.
   */
  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    if (!this.deferredPrompt) {
      return 'unsupported';
    }

    try {
      this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.updateState({ canInstall: false });
      return choice.outcome;
    } catch {
      return 'unsupported';
    }
  }

  /**
   * Applies the pending update safely.
   */
  public applyUpdate(): void {
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  public getState(): PWAState {
    return { ...this.state };
  }

  public subscribe(listener: PWAStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<PWAState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (err) {
        console.error('[PWA] Listener error:', err);
      }
    });
  }
}

export const pwaManager = new PWAManager();
