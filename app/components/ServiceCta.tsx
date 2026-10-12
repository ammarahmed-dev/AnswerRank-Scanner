import Link from "next/link";

export default function ServiceCta() {
  return (
    <aside className="service-cta surface" aria-label="Optimization help">
      <div className="service-cta-text">
        <h2>Need help optimizing for AEO, GEO and SEO?</h2>
        <p>
          Tell us about your site and we will reply with what to fix first. Reach out for an AI search and SEO
          review, or help implementing the fixes.
        </p>
      </div>
      <Link href="/contact?subject=services" className="btn btn-primary service-cta-btn">
        Talk to us
      </Link>
    </aside>
  );
}
