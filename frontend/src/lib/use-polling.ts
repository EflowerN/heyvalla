"use client";
import { useEffect, useRef } from "react";
/** Poll visible dashboards without overlapping background requests. */
export function usePolling(load: () => Promise<void>, enabled = true) {
  const latest = useRef(load);
  useEffect(() => { latest.current = load; }, [load]);
  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const timer = setInterval(async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try { await latest.current(); } finally { running = false; }
    }, 15000);
    return () => clearInterval(timer);
  }, [enabled]);
}
