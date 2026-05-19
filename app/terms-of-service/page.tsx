import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service | AEOCheck AI Scanner",
  description:
    "Read the terms for using AEOCheck, including scan allowances, contact-based paid access, report usage, and acceptable use.",
  path: "/terms-of-service",
});

export default function TermsOfServicePage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <div className="legal-page-inner">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: May 12, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using AEOCheck at www.aeocheck.co, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          AEOCheck provides AI search readiness audits for publicly accessible web pages. Our scanner analyzes page content, metadata, structured data, and technical signals to generate a scored readiness report with actionable recommendations.
        </p>
        <p>
          AEOCheck is an independent product and is not affiliated with Google, OpenAI, Perplexity, or any AI search engine provider.
        </p>

        <h2>3. Accounts</h2>
        <p>To access certain features, you must create an account. You are responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activity that occurs under your account</li>
          <li>Ensuring your account information is accurate and up to date</li>
        </ul>
        <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>

        <h2>4. Acceptable Use</h2>
        <p>You may only use AEOCheck to scan:</p>
        <ul>
          <li>Websites you own</li>
          <li>Websites you have explicit permission to audit</li>
          <li>Publicly accessible pages (no login-required content)</li>
        </ul>
        <p>You may not:</p>
        <ul>
          <li>Scan websites without authorization</li>
          <li>Use the scanner to probe internal, private, or government systems</li>
          <li>Attempt to reverse-engineer, scrape, or replicate our platform</li>
          <li>Use automated scripts to abuse the scan API</li>
          <li>Resell or redistribute reports without written permission</li>
          <li>Use the service for any unlawful purpose</li>
        </ul>
        <p>Violation of these terms may result in immediate account termination.</p>

        <h2>5. Scan Limits by Plan</h2>
        <p>AEOCheck offers the following scan allowances by plan:</p>
        <ul>
          <li>
            Guest (no account): 1 free preview scan. No signup required. Results are limited to a basic score preview only.
          </li>
          <li>
            Free account: 3 full scans per month. Resets on a rolling 30-day basis. Reports show overall score and top 3 issues only.
          </li>
          <li>
            Full Report ($14 one-time): Unlocks the complete report for the specific URL that was scanned. Includes full issue breakdown, schema recommendations, AI Answer Snapshot, competitor takeaway, and client-ready PDF. This is a per-report unlock, not a general scan credit, and it applies to the scanned URL only.
          </li>
          <li>
            Pro Monthly ($39/month): 30 full reports per month. Includes all Full Report features plus saved report history and priority scan access.
          </li>
        </ul>
        <p>Scan limits are enforced server-side. We reserve the right to adjust limits with reasonable notice to registered users.</p>

        <h2>6. Payments</h2>
        <p>
          Paid access is currently handled through our contact flow. When a paid plan is activated, you agree to provide accurate billing information and authorize the applicable charge.
        </p>
        <ul>
          <li>Full Report ($14): One-time payment that unlocks the full report for the specific scanned URL</li>
          <li>Pro Monthly ($39/month): Recurring subscription billed monthly. Contact us for billing support and activation details.</li>
        </ul>
        <p>For billing questions, contact <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a></p>

        <h2>7. Refund Policy</h2>
        <p>
          Please see our full Refund Policy at <a href="https://www.aeocheck.co/refund-policy">www.aeocheck.co/refund-policy</a> for complete details.
        </p>
        <p>Summary:</p>
        <ul>
          <li>Full Report purchases are eligible for a refund within 7 days of purchase if the report failed to generate correctly or contained a technical error</li>
          <li>As an alternative to a refund, we may re-assign your Full Report credit to a different URL of your choice within 7 days</li>
          <li>Pro Monthly subscriptions can be cancelled at any time; no partial month refunds</li>
        </ul>

        <h2>8. Disclaimer of Warranties</h2>
        <p>
          AEOCheck is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee:
        </p>
        <ul>
          <li>Specific improvements in AI search visibility</li>
          <li>Accuracy of all recommendations for every use case</li>
          <li>Uninterrupted or error-free service</li>
        </ul>
        <p>
          Our reports are generated from automated analysis and should be reviewed before implementing any recommendations.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, AEOCheck and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to loss of revenue, data, or business opportunities.
        </p>
        <p>
          Our total liability to you for any claim shall not exceed the amount you paid to AEOCheck in the 12 months prior to the claim.
        </p>

        <h2>10. Intellectual Property</h2>
        <ul>
          <li>AEOCheck, its branding, and platform code are our intellectual property</li>
          <li>Reports generated for your URLs are yours to use for your own business purposes</li>
          <li>You may not reproduce, resell, or publish reports commercially without written permission</li>
          <li>You retain ownership of all URLs and content you submit for scanning</li>
        </ul>

        <h2>11. Governing Law</h2>
        <p>
          These Terms of Service shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
        </p>
        <p>
          Any disputes arising from these terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
        </p>

        <h2>12. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. We will notify registered users of material changes by email at least 7 days before they take effect. Continued use of AEOCheck after changes constitutes acceptance.
        </p>

        <h2>13. Contact</h2>
        <p>For questions about these terms:</p>
        <p>
          Email: <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a><br />
          Website: <a href="https://www.aeocheck.co">www.aeocheck.co</a>
        </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
