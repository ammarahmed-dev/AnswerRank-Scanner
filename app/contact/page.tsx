import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "@/app/components/ContactForm";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact | AEOCheck",
  description:
    "Contact AEOCheck for questions about AI search readiness scans, reports, pricing, or manually activated paid access.",
  path: "/contact",
});

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact AEOCheck",
  url: `${SITE_URL}/contact`,
  description:
    "Contact the AEOCheck team with questions about your report, billing, or the scanner.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }} />
      <SiteHeader />
      <section className="launch-section contact-section">
        <div className="launch-container contact-grid">
          <div className="section-intro contact-intro">
            <p className="launch-eyebrow" style={{ display: "block", marginBottom: "16px" }}>Contact</p>
            <h1>Get in touch</h1>
            <p>
              Have a question about your report, billing, or the scanner? We&apos;ll get back to
              you within 24 hours.
            </p>
            <p className="contact-email-alt">
              Or email us directly at{" "}
              <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a>
            </p>
          </div>
          <Suspense fallback={<div className="surface contact-form-shell" style={{ minHeight: 420 }} />}>
            <ContactForm />
          </Suspense>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
