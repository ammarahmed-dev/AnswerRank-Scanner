"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const FEATURES = [
  { href: "/scan",    label: "Scan",    desc: "Check your AI visibility score",    emoji: "⚡" },
  { href: "/compare", label: "Compare", desc: "Side-by-side URL comparison",        emoji: "⚖️" },
  { href: "/audit",   label: "Audit",   desc: "Multi-page site audit",              emoji: "📋" },
  { href: "/monitor", label: "Monitor", desc: "Track score changes over time",      emoji: "📡" },
] as const;

export { FEATURES };

export default function FeaturesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      className="nav-features"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`nav-features-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Features
        <ChevronDown className="nav-features-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="nav-features-dropdown" role="menu">
          {FEATURES.map(({ href, label, desc, emoji }) => (
            <a
              key={href}
              href={href}
              className="nav-features-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <div className="nav-features-icon">
                <span aria-hidden="true">{emoji}</span>
              </div>
              <div>
                <div className="nav-features-title">{label}</div>
                <div className="nav-features-desc">{desc}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
