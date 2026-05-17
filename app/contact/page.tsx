import type { Metadata } from "next";
import ContactForm from "@/app/components/ContactForm";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";

export const metadata: Metadata = {
  title: "Contact - AEOCheck",
  description:
    "Get in touch with the AEOCheck team. Questions about your report, billing, or the scanner answered within 24 hours.",
  alternates: {
    canonical: "https://www.aeocheck.co/contact",
  },
  openGraph: {
    title: "Contact - AEOCheck",
    description:
      "Get in touch with the AEOCheck team. Questions about your report, billing, or the scanner answered within 24 hours.",
    url: "https://www.aeocheck.co/contact",
    siteName: "AEOCheck",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen">
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
          <ContactForm />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
