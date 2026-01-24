"use client";

import {
  useEffect,
  useCallback,
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

interface PWAContextValue {
  isInstalled: boolean;
  isOnline: boolean;
  swRegistration: ServiceWorkerRegistration | null;
}

const PWAContext = createContext<PWAContextValue>({
  isInstalled: false,
  isOnline: true,
  swRegistration: null,
});

export function usePWA() {
  return useContext(PWAContext);
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  const registerServiceWorker = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        {
          scope: "/",
          updateViaCache: "none",
        },
      );

      setSwRegistration(registration);

      // Check for updates periodically
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
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
      });

      console.log("Service Worker registered successfully");
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }, []);

  useEffect(() => {
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

    checkInstalled();
    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register service worker
    registerServiceWorker();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [registerServiceWorker]);

  return (
    <PWAContext.Provider value={{ isInstalled, isOnline, swRegistration }}>
      {children}
    </PWAContext.Provider>
  );
}
