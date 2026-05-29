"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <div className="error-page-inner">
        <span className="error-code">Error</span>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred. You can try again or return to the homepage.</p>
        <div className="error-page-actions">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Back to AEOCheck
          </Link>
        </div>
      </div>
    </main>
  );
}
