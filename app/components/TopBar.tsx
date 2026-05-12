"use client";

import { useEffect, useState } from "react";

export default function TopBar() {
  const [displayCount, setDisplayCount] = useState("500+");
  const [targetCount, setTargetCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { count?: number }) => {
        if (data?.count) {
          setTargetCount(data.count);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!targetCount) return;

    const duration = 1500;
    const steps = 40;
    const stepMs = duration / steps;
    const startCount = Math.max(0, targetCount - 200);
    let current = startCount;
    const increment = (targetCount - startCount) / steps;
    let tickTimeout: ReturnType<typeof setTimeout> | null = null;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCount) {
        current = targetCount;
        clearInterval(timer);
        setDisplayCount(targetCount.toLocaleString("en-US"));

        let liveCount = targetCount;
        const scheduleNextTick = () => {
          const delay = Math.floor(Math.random() * 12000) + 6000;
          tickTimeout = setTimeout(() => {
            liveCount += 1;
            setDisplayCount(liveCount.toLocaleString("en-US"));
            fetch("/api/stats/increment", { method: "POST" }).catch(() => {});
            scheduleNextTick();
          }, delay);
        };
        scheduleNextTick();
        return;
      }

      setDisplayCount(Math.floor(current).toLocaleString("en-US"));
    }, stepMs);

    return () => {
      clearInterval(timer);
      if (tickTimeout) clearTimeout(tickTimeout);
    };
  }, [targetCount]);

  return (
    <div className="top-bar" aria-live="polite">
      <span className="top-bar-dot" aria-hidden="true" />
      <span className="top-bar-text">
        <span className="top-bar-count">{displayCount}</span>{" "}
        URLs scanned and counting
      </span>
    </div>
  );
}
