import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CheckCircle2, Code2, FileCheck2, Layers3 } from "lucide-react";
import ContactForm from "@/app/components/ContactForm";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { SERVICES_PATH } from "@/lib/service-enquiry";
import "./services.css";

export const metadata: Metadata = buildPageMetadata({
  title: "AEO & GEO Implementation Services | AEOCheck",
  description: "Get hands-on help implementing technical SEO, structured data and content fixes. Agree a clear scope, review changes and receive verification evidence.",
  path: SERVICES_PATH,
});
const packages = [
  { icon: Code2, title: "Website fixes sprint", price: "$499", cadence: "one-time starting price", lead: "You have findings. Get the priority fixes implemented.",
    scope: "One site, up to 3 agreed fixes within 4 hours of implementation and verification.",
    items: ["Review the findings and agree what to fix", "Implement agreed technical and template changes", "Verify the changes and hand over the evidence"] },
  { icon: FileCheck2, title: "Key-page improvement", price: "$999", cadence: "one-time starting price", lead: "Make your important pages easier to understand and use.",
    scope: "Up to 3 existing pages within 8 hours of content, markup and internal-link improvements.",
    items: ["Clarify answers, headings and product information", "Improve applicable schema and internal links", "Review content facts with you before publishing"] },
  { icon: Layers3, title: "Ongoing improvement", price: "$499", cadence: "per month, starting price", lead: "Keep improving after the foundation is in place.",
    scope: "Up to 4 hours per month for agreed improvements, verification and a progress summary.",
    items: ["Prioritize useful follow-up work", "Review organic data where access is available", "Record what changed and what remains unverified"] },
];
const steps = [
  ["01", "Review your site", "Share the URL and what you need help with. An existing scan is useful, but you do not need one to enquire."],
  ["02", "Agree the scope", "We confirm the pages, deliverables, access, exclusions and acceptance checks before work begins."],
  ["03", "Review and publish", "We implement reviewable changes. You approve business claims and authorize publication to your website."],
  ["04", "Verify and hand over", "Receive a dated change log, technical checks and next steps. Later traffic and AI-answer observations are measured separately."],
];
const faqs = [
  ["How does pricing work?", "Prices start at $499 for a fixes sprint, $999 for key-page improvements and $499 per month for ongoing work, in USD. We review the site and confirm deliverables, the time allowance, final price and any applicable tax in a written proposal. Work beyond that scope needs a separate agreement."],
  ["Is implementation included in my scanner plan?", "No. Scanner plans provide product features. Implementation is a separate service with an agreed proposal and scope; enquiring does not change your plan."],
  ["Do you guarantee rankings or AI citations?", "No. We commit to agreed work and verification. A readiness score, crawler access or schema repair does not establish inclusion in an AI answer, and rankings and citations can change."],
  ["Can you work with my current website?", "Tell us your platform and the changes you need. We review Webflow, WordPress, Shopify and custom-site work before confirming fit and access. You do not need to move platforms to enquire."],
  ["What access will you need?", "That depends on the scope. We agree appropriate staging or collaborator access after review. Do not send passwords or private report links through this form."],
  ["Do I need to book a call or pay to enquire?", "No. Send your website URL and a short description. The form requests a proposal; it does not take payment, create a booking or start a contract."],
  ["What will I receive?", "An agreed backlog, the implemented changes, verification evidence and handover notes. Content changes need your factual approval. Ongoing measurement is scoped separately and depends on available data and access."],
];
const schema = {
  "@context": "https://schema.org", "@type": "Service",
  name: "AEO and GEO implementation services", url: `${SITE_URL}${SERVICES_PATH}`,
  serviceType: "Website SEO and AI search readiness implementation",
  description: "Scoped technical, structured-data and content implementation with verification and handover.",
  provider: { "@type": "Organization", name: "AEOCheck", url: SITE_URL },
};

export default function ImplementationServicesPage() {
  return <>
    <SiteHeader />
    <main className="services-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="services-hero launch-container">
        <p className="services-eyebrow">AEO / GEO implementation services</p>
        <h1>Turn your website audit into <span>implemented fixes.</span></h1>
        <p className="services-lead">For site owners and small teams who want hands-on help with technical SEO, structured data and clearer content. Agree the scope, review the work and see what was verified.</p>
        <div className="services-actions">
          <a href="#enquiry" className="btn btn-primary">Request an implementation proposal <ArrowRight size={16} aria-hidden="true" /></a>
          <a href="#scope" className="btn btn-secondary">View pricing and scope</a>
        </div>
        <p className="services-note">Need a starting point? <Link href="/#scanner">Scan your website</Link> or <Link href="/sample-report">view a sample report</Link>.</p>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-work">
        <p className="services-eyebrow">From findings to changes</p>
        <h2 id="services-work">Practical work on your existing site.</h2>
        <div className="services-outcomes">
          <article className="surface"><h3>Technical foundations</h3><p>Investigate crawl and canonical conflicts, sitemap issues and relevant metadata. Fix demonstrated problems rather than changing settings indiscriminately.</p></article>
          <article className="surface"><h3>Accurate structured data</h3><p>Implement or repair applicable markup that matches visible page facts. Schema is part of a useful page, not a promise of AI placement.</p></article>
          <article className="surface"><h3>Clearer priority pages</h3><p>Improve answers, headings and internal links on the pages that matter to your visitors. You approve product claims and business details.</p></article>
        </div>
      </section>

      <section id="scope" className="services-section launch-container" aria-labelledby="services-scope">
        <p className="services-eyebrow">Choose the scope</p>
        <h2 id="services-scope">Start with the work you actually need.</h2>
        <p className="services-intro">Starting prices in USD. We confirm the exact work, final price and any applicable tax in a written proposal before you commit. Implementation and verification share the stated time allowance. Larger backlogs are quoted separately. These services are separate from AEOCheck software subscriptions.</p>
        <div className="services-packages">
          {packages.map(({ icon: Icon, title, price, cadence, lead, scope, items }) => <article className="surface services-package" key={title}>
            <Icon size={24} className="services-icon" aria-hidden="true" />
            <h3>{title}</h3><p>{lead}</p>
            <p className="services-price"><strong>{price}</strong><span>USD / {cadence}</span></p><p className="services-package-scope">{scope}</p>
            <ul>{items.map(item => <li key={item}><CheckCircle2 size={16} aria-hidden="true" /><span>{item}</span></li>)}</ul>
            <p className="services-note">Final scope and price agreed before work begins</p>
            <a href="#enquiry" className="btn btn-secondary">Discuss this scope</a>
          </article>)}
        </div>
        <p className="services-note">Third-party tools, hosting, paid placements, a full redesign and new long-form articles are excluded. Ongoing work is agreed month by month; this form does not start a subscription or take payment.</p>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-process">
        <p className="services-eyebrow">How delivery works</p><h2 id="services-process">Clear scope. Reviewable work. Verified handover.</h2>
        <ol className="services-steps">{steps.map(([number, title, detail]) => <li className="surface" key={number}>
          <span className="services-step-number" aria-hidden="true">{number}</span><h3>{title}</h3><p>{detail}</p>
        </li>)}</ol>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-evidence">
        <div className="surface services-evidence">
          <div><p className="services-eyebrow">What you receive</p><h2 id="services-evidence">Evidence of the work, with clear limits.</h2>
            <p>Your handover separates implemented fixes and technical checks from organic traffic and observed AI mentions. A repaired issue can be verified immediately; search outcomes need their own dated evidence.</p></div>
          <div><h3>Illustrative handover example</h3><p>A product page has conflicting canonical tags. The agreed change removes the conflict. Verification records the deployed URL, resulting HTML and check date. This proves that repair; it does not prove a ranking or citation gain.</p><p className="services-note">Example only, not a customer case study.</p></div>
        </div>
        <div className="services-operator"><h3>Led by Ammar Ahmed, AEOCheck&apos;s founder.</h3><p>We review your platform and implementation requirements before agreeing an engagement. Work stays tied to your existing site, your approvals and an explicit handover.</p></div>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-faq">
        <p className="services-eyebrow">Before you enquire</p><h2 id="services-faq">A few useful answers.</h2>
        <div className="services-faq">{faqs.map(([question, answer]) => <details className="surface" key={question}>
          <summary>{question}</summary><p>{answer}</p>
        </details>)}</div>
      </section>

      <section id="enquiry" className="services-section launch-container services-enquiry" aria-labelledby="services-enquiry-heading">
        <div><p className="services-eyebrow">Tell us about your site</p><h2 id="services-enquiry-heading">Request an implementation proposal.</h2>
          <p>Share your website and what you want to improve. We will review the request and contact you to discuss fit and scope.</p>
          <p className="services-note">No account, call booking or payment required. This is a service enquiry, not a scanner-plan upgrade.</p>
          <p className="services-note">Prefer email? <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a></p></div>
        <div className="surface services-form"><Suspense fallback={<p>Loading enquiry form...</p>}><ContactForm services /></Suspense></div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
