import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <div className="error-page-inner">
        <span className="error-code">404</span>
        <h1>Page not found</h1>
        <p>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="btn btn-primary">
          Back to AEOCheck
        </Link>
      </div>
    </main>
  );
}
