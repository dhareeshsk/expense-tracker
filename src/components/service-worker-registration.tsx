"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // Registration failures shouldn't break the app - it just won't be
      // installable/offline-capable - but they must not be invisible either
      // (a silently-swallowed failure here previously masked a broken PWA
      // install/offline shell for an entire release).
      console.error("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
