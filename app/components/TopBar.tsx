"use client";

import { useEffect, useState } from "react";

// Shows the real scan count from /api/stats once it loads. No count-up animation or simulated
// "live" increments: the number only changes when real scans do.
export default function TopBar() {
  // No placeholder number: show the count only once the real value has loaded.
  const [displayCount, setDisplayCount] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { display?: string; count?: number }) => {
        if (cancelled) return;
        if (data?.display) setDisplayCount(data.display);
        else if (data?.count) setDisplayCount(data.count.toLocaleString("en-US"));
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
