"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    // Links like "/#faq" from another page should land on that section, not the top.
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) {
      // Wait a frame so the new page's sections are in the DOM.
      const frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView();
        else window.scrollTo(0, 0);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
