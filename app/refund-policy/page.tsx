import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";

export const metadata: Metadata = {
  title: "Refund Policy | AEOCheck AI Scanner",
  description: "Read AEOCheck's refund policy. We offer a fair refund process for Full Report purchases and Pro Monthly subscriptions.",
  alternates: {
    canonical: "https://www.aeocheck.co/refund-policy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <div className="legal-page-inner">
          <h1>Refund Policy</h1>
          <p className="legal-updated">Last updated: May 12, 2026</p>

        <h2>Our Commitment</h2>
        <p>
          We want you to be satisfied with every AEOCheck report. If something goes wrong on our end, we will make it right.
        </p>

        <h2>Full Report - $14 One-Time Purchase</h2>
        <p>You are eligible for a full refund if:</p>
        <ul>
          <li>The report failed to generate due to a technical error on our end</li>
          <li>The report returned clearly incorrect or completely empty results</li>
          <li>You were charged but never received access to the full report</li>
          <li>You request a refund within 7 days of purchase</li>
        </ul>
        <p>How to request a refund:</p>
        <p>Email <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a> with:</p>
        <ul>
          <li>Your account email</li>
          <li>The URL you scanned</li>
          <li>A brief description of the issue</li>
        </ul>
        <p>We will review and respond within 2 business days.</p>

        <p><strong>Alternative - Report Re-assignment:</strong></p>
        <p>
          If your report generated correctly but you would like to scan a different URL instead, we can re-assign your Full Report credit to a new URL of your choice within 7 days of purchase. This is useful if you accidentally scanned the wrong URL.
        </p>
        <p>
          To request a re-assignment, email <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a> with your original scan URL and the new URL you would like to scan.
        </p>

        <p>We do not offer refunds if:</p>
        <ul>
          <li>The report generated successfully and you disagree with the score or recommendations</li>
          <li>You simply changed your mind after receiving a working report</li>
          <li>More than 7 days have passed since purchase</li>
        </ul>

        <h2>Pro Monthly - $39/Month Subscription</h2>
        <ul>
          <li>You may cancel your Pro Monthly subscription at any time from your account dashboard</li>
          <li>Cancellation takes effect at the end of your current billing period</li>
          <li>We do not offer partial month refunds for Pro Monthly subscriptions</li>
          <li>If you were charged after cancelling due to a technical error, contact us within 7 days for a full refund</li>
        </ul>

        <h2>How Refunds Are Processed</h2>
        <p>
          Approved refunds are returned to your original payment method within 5-10 business days, depending on your bank or card provider.
        </p>

        <h2>Contact</h2>
        <p>For all refund and billing questions:</p>
        <p>
          Email: <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a><br />
          We aim to respond within 2 business days.
        </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
