import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy | AEOCheck AI Scanner",
  description:
    "Read AEOCheck's privacy policy for our AI search readiness scanner, report storage, contact flow, and analytics handling.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <div className="legal-page-inner">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: May 12, 2026</p>

        <h2>1. Who We Are</h2>
        <p>
          AEOCheck ("we", "us", "our") is an AI search readiness scanner operated at www.aeocheck.co. We help website owners understand how visible their pages are to AI search engines like ChatGPT, Perplexity, and Google AI Overviews.
        </p>
        <p>
          For privacy questions, contact us at:{" "}
          <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a>
        </p>

        <h2>2. Information We Collect</h2>
        <p><strong>Information you provide:</strong></p>
        <ul>
          <li>Email address and password when you create an account</li>
          <li>URLs you submit for scanning</li>
          <li>Name, email, subject, and message when you contact us</li>
          <li>Billing details processed through Lemon Squeezy when purchasing a paid plan</li>
        </ul>
        <p><strong>Information collected automatically:</strong></p>
        <ul>
          <li>Basic usage data (pages visited, scan count, session duration)</li>
          <li>IP address (used for rate limiting only, not stored long-term)</li>
          <li>Browser type and device information</li>
          <li>Cookies required for authentication sessions</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Generate and store your AEO readiness reports</li>
          <li>Manage your account and subscription status</li>
          <li>Handle paid access requests and send receipts when access is activated</li>
          <li>Respond to support and contact requests</li>
          <li>Enforce scan limits by plan tier</li>
          <li>Improve scanner accuracy over time</li>
          <li>Send transactional emails (report ready, access updates, account updates)</li>
        </ul>
        <p>
          We do not sell, rent, or share your personal data with third parties for marketing purposes.
        </p>

        <h2>4. Data Storage and Retention</h2>
        <ul>
          <li>All data is stored securely in Supabase (PostgreSQL) with encryption at rest</li>
          <li>Guest scan data is not permanently stored</li>
          <li>Logged-in user scan history and reports are retained while your account is active</li>
          <li>Contact form submissions are retained for up to 12 months</li>
          <li>You may request deletion of your account and all associated data at any time by emailing <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a></li>
        </ul>

        <h2>5. Cookies</h2>
        <p>We use the following cookies:</p>
        <ul>
          <li>Authentication cookies: Required to keep you logged in. Cannot be disabled.</li>
          <li>Analytics cookies: Used via Google Analytics through Google Tag Manager to understand how visitors use the site. These are anonymized and do not identify you personally.</li>
        </ul>
        <p>We do not use advertising or retargeting cookies.</p>

        <h2>6. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li>Supabase: database and authentication</li>
          <li>Vercel: hosting and edge delivery</li>
          <li>Resend: transactional email delivery</li>
          <li>OpenAI / Google Gemini: AI analysis of scanned page content</li>
          <li>Google PageSpeed API: performance scoring</li>
          <li>Google Analytics / GTM: anonymized usage analytics</li>
          <li>Billing support providers: used when paid access is activated</li>
        </ul>
        <p>Each third party has their own privacy policy governing their data practices.</p>

        <h2>7. Your Rights</h2>
        <p>
          Depending on your location, you may have the following rights regarding your personal data:
        </p>
        <ul>
          <li>Access: Request a copy of your data</li>
          <li>Deletion: Request deletion of your account and associated data</li>
          <li>Correction: Request correction of inaccurate data</li>
          <li>Portability: Request your data in a portable format</li>
          <li>Objection: Object to certain processing</li>
        </ul>
        <p>
          To exercise any of these rights, email us at <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a>. We will respond within 30 days.
        </p>

        <h2>8. Children&apos;s Privacy</h2>
        <p>
          AEOCheck is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us at <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a>.
        </p>

        <h2>9. Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify registered users of material changes by email. Continued use of AEOCheck after changes constitutes acceptance of the updated policy.
        </p>

        <h2>11. Contact</h2>
        <p>For any privacy-related questions or requests:</p>
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
