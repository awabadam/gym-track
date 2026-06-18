"use client";

import { useEffect } from "react";

export function WakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake lock can fail (e.g. low battery, tab not visible)
      }
    }

    acquire();

    // Re-acquire on visibility change (browser releases on tab switch)
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        acquire();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      lock?.release();
    };
  }, []);

  return null;
}
