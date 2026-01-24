"use client";

import {
  useEffect,
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

// BeforeInstallPromptEvent is not in standard TypeScript types
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAContextValue {
  isInstalled: boolean;
  isOnline: boolean;
  swRegistration: ServiceWorkerRegistration | null;
  canInstall: boolean;
  promptInstall: () => Promise<boolean>;
}

const PWAContext = createContext<PWAContextValue>({
  isInstalled: false,
  isOnline: true,
  swRegistration: null,
  canInstall: false,
  promptInstall: async () => false,
});

export function usePWA() {
  return useContext(PWAContext);
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const canInstall = !isInstalled && deferredPrompt !== null;

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // Clear the prompt - can only be used once
      setDeferredPrompt(null);
      return outcome === "accepted";
    } catch (error) {
      console.error("Install prompt failed:", error);
      return false;
    }
  }, [deferredPrompt]);

  useEffect(() => {
    // Guard against server-side execution before accessing window APIs
    if (typeof window === "undefined") {
      return undefined;
    }

    let isMounted = true;
    let registration: ServiceWorkerRegistration | null = null;
    let updateFoundHandler:
      | ((this: ServiceWorkerRegistration, event: Event) => void)
      | null = null;

    // Check if app is installed (standalone mode)
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true;
      setIsInstalled(isStandalone);
    };

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Capture the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Handle successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    checkInstalled();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      try {
        registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          {
            scope: "/",
            updateViaCache: "none",
          },
        );

        updateFoundHandler = () => {
          const newWorker = registration?.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New content available, could prompt user to refresh
                console.log("New content available, refresh to update.");
              }
            });
          }
        };

        if (updateFoundHandler) {
          registration.addEventListener("updatefound", updateFoundHandler);
        }

        // Track the ready registration asynchronously to avoid synchronous state updates
        navigator.serviceWorker.ready.then((readyRegistration) => {
          if (isMounted) {
            setSwRegistration(readyRegistration);
          }
        });

        console.log("Service Worker registered successfully");
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    };

    // Register the service worker after listeners are set to avoid synchronous state updates
    void registerServiceWorker();

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (registration && updateFoundHandler) {
        registration.removeEventListener("updatefound", updateFoundHandler);
      }
    };
  }, []);

  return (
    <PWAContext.Provider value={{ isInstalled, isOnline, swRegistration, canInstall, promptInstall }}>
      {children}
    </PWAContext.Provider>
  );
}
