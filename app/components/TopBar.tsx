"use client";

import { useEffect, useState } from "react";

const MIN_COUNT_TO_SHOW = 100;

// Shows the real scan count from /api/stats once it loads. No count-up animation or simulated
// "live" increments: the number only changes when real scans do.
export default function TopBar() {
  // No placeholder number: show the count only once the real value has loaded.
  const [displayCount, setDisplayCount] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { display?: string; count?: number | null }) => {
        if (cancelled) return;
        // Small counts look weak and may include test scans, so show the number only once it is meaningful.
        if (typeof data?.count === "number" && data.count >= MIN_COUNT_TO_SHOW) {
          setDisplayCount(data.display ?? data.count.toLocaleString("en-US"));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="top-bar">
      <span className="top-bar-dot" aria-hidden="true" />
      <span className="top-bar-text">
        {displayCount ? (
          <>
            <span className="top-bar-count">{displayCount}</span>{" "}
            URLs scanned and counting
          </>
        ) : (
          "Free AI search readiness scanner"
        )}
      </span>
    </div>
  );
}
