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
  { icon: Code2, title: "Fixes Sprint", recommended: false, price: "$499", cadence: "one-time starting price", lead: "You have findings. Get the priority fixes implemented.",
    scope: "One website. Up to 3 agreed technical or template fixes, with deployed checks and a written handover.",
    items: ["Review the findings and agree what to fix", "Implement agreed technical and template changes", "Verify the changes and hand over the evidence"] },
  { icon: FileCheck2, title: "AEO/GEO Foundation", recommended: true, price: "$1,499", cadence: "one-time starting price", lead: "Build a clear foundation before ongoing optimization.",
    scope: "One website. A foundation review and coordinated improvements across up to 3 existing priority pages.",
    items: ["Review crawl access, canonicals, metadata and entity consistency", "Implement agreed technical fixes and applicable structured data", "Improve answers, headings and internal links on priority pages", "Receive verification evidence and a prioritized next-step roadmap"] },
  { icon: Layers3, title: "Ongoing Optimization", recommended: false, price: "$999", cadence: "per month, starting price", lead: "Keep improving after the foundation is in place.",
    scope: "One website. A monthly delivery plan with up to 2 existing-page improvements, agreed before each cycle.",
    items: ["Start with a foundation review and agreed monthly priorities", "Improve selected pages and their applicable markup and links", "Review available Search Console query and page evidence", "Receive a monthly change log, findings and next actions"] },
];
const steps = [
  ["01", "Review your site", "Share the URL and what you need help with. An existing scan is useful, but you do not need one to enquire."],
  ["02", "Agree the scope", "We confirm the pages, deliverables, access, exclusions and acceptance checks before work begins."],
  ["03", "Review and publish", "We implement reviewable changes. You approve business claims and authorize publication to your website."],
  ["04", "Verify and hand over", "Receive a dated change log, technical checks and next steps. Later traffic and AI-answer observations are measured separately."],
];
const faqs = [
  ["How does pricing work?", "Prices start at $499 for a Fixes Sprint, $1,499 for AEO/GEO Foundation and $999 per month for Ongoing Optimization, in USD. We review the site and confirm deliverables, page and template boundaries, final price and any applicable tax in a written proposal. Work beyond that scope needs a separate agreement."],
  ["Is implementation included in my scanner plan?", "No. Scanner plans provide product features. Implementation is a separate service with an agreed proposal and scope; enquiring does not change your plan."],
  ["Do you guarantee rankings or AI citations?", "No. We commit to agreed work and verification. A readiness score, crawler access or schema repair does not establish inclusion in an AI answer, and rankings and citations can change."],
  ["Can you work with my current website?", "Tell us your platform and the changes you need. We review Webflow, WordPress, Shopify and custom-site work before confirming fit and access. You do not need to move platforms to enquire."],
  ["What access will you need?", "That depends on the scope. We agree appropriate staging or collaborator access after review. Do not send passwords or private report links through this form."],
  ["Do I need to book a call or pay to enquire?", "No. Send your website URL and a short description. The form requests a proposal; it does not take payment, create a booking or start a contract."],
  ["What will I receive?", "An agreed delivery plan, implemented changes, a dated change log, verification evidence and a prioritized handover. Content changes need your factual approval. Ongoing measurement is scoped separately and depends on available data and access."],
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
        <h1>Make your website clearer for <span>AI search and your buyers.</span></h1>
        <p className="services-lead">Help AI systems and potential customers understand what you do, who you serve and why your pages are useful. We turn technical findings and content gaps into implemented improvements, with a clear plan and evidence of the work.</p>
        <div className="services-actions">
          <a href="#enquiry" className="btn btn-primary">Request an implementation proposal <ArrowRight size={16} aria-hidden="true" /></a>
          <a href="#scope" className="btn btn-secondary">View pricing and scope</a>
        </div>
        <p className="services-note">Need a starting point? <Link href="/#scanner">Scan your website</Link> or <Link href="/sample-report">view a sample report</Link>.</p>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-challenge">
        <p className="services-eyebrow">Why this work matters</p>
        <h2 id="services-challenge">Your expertise needs to be easy to find and understand.</h2>
        <p className="services-intro">Buyers ask detailed questions before choosing a provider. If your important pages are difficult to retrieve, your business details conflict or your answers are buried, those pages are less useful to both people and search systems.</p>
        <div className="services-outcomes">
          <article className="surface"><h3>Can your pages be retrieved?</h3><p>Check crawl access, rendering, canonical signals and internal discovery before adding more content.</p></article>
          <article className="surface"><h3>Is your business unambiguous?</h3><p>Align visible business and product facts with applicable structured data and consistent entity information.</p></article>
          <article className="surface"><h3>Do you answer the buyer’s question?</h3><p>Make priority pages specific, well sourced and clear about your offer, fit and next step.</p></article>
        </div>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-work">
        <p className="services-eyebrow">What we improve</p>
        <h2 id="services-work">A clearer path from discovery to a useful answer.</h2>
        <div className="services-outcomes">
          <article className="surface"><h3>Technical foundations</h3><p>Investigate crawl and canonical conflicts, sitemap issues and relevant metadata. Fix demonstrated problems rather than changing settings indiscriminately.</p></article>
          <article className="surface"><h3>Accurate structured data</h3><p>Implement or repair applicable markup that matches visible page facts. Schema is part of a useful page, not a promise of AI placement.</p></article>
          <article className="surface"><h3>Clearer priority pages</h3><p>Improve answers, headings and internal links on the pages that matter to your visitors. You approve product claims and business details.</p></article>
        </div>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-measurement">
        <p className="services-eyebrow">How progress is reviewed</p><h2 id="services-measurement">See what shipped. Understand what changed.</h2>
        <div className="services-outcomes">
          <article className="surface"><h3>Implementation evidence</h3><p>Receive the changed URLs, the work completed and dated technical checks. Every agreed deliverable has an acceptance check.</p></article>
          <article className="surface"><h3>Organic discovery</h3><p>Where access is available, review Search Console clicks, impressions and relevant query/page patterns over comparable windows, with data lag recorded.</p></article>
          <article className="surface"><h3>AI mentions and citations</h3><p>These require separate observations with recorded prompts, engines and dates. Quantified AI-answer monitoring is scoped separately; crawler access and a readiness score alone do not establish inclusion.</p></article>
        </div>
      </section>

      <section id="scope" className="services-section launch-container" aria-labelledby="services-scope">
        <p className="services-eyebrow">Choose the scope</p>
        <h2 id="services-scope">Fix a specific issue. Build your foundation. Keep improving.</h2>
        <p className="services-intro">Starting prices in USD. We confirm the exact work, final price and any applicable tax in a written proposal before you commit. Each proposal defines the deliverables, page and template boundaries, review round and acceptance checks. Larger backlogs are quoted separately. These services are separate from AEOCheck software subscriptions. Choose a sprint for a small backlog, Foundation for coordinated improvements, or ongoing work after a foundation review.</p>
        <div className="services-packages">
          {packages.map(({ icon: Icon, title, price, cadence, lead, scope, items, recommended }) => <article className="surface services-package" key={title}>
            <Icon size={24} className="services-icon" aria-hidden="true" />
            {recommended && <p className="services-recommended">Recommended starting point</p>}
            <h3>{title}</h3><p>{lead}</p>
            <p className="services-price"><strong>{price}</strong><span>USD / {cadence}</span></p><p className="services-package-scope">{scope}</p>
            <ul>{items.map(item => <li key={item}><CheckCircle2 size={16} aria-hidden="true" /><span>{item}</span></li>)}</ul>
            <p className="services-note">Final scope and price agreed before work begins</p>
            <a href="#enquiry" className="btn btn-secondary">Discuss this scope</a>
          </article>)}
        </div>
        <p className="services-note">One review round is included for the agreed changes. New pages, additional templates, integrations and broader technical work receive a custom proposal. Third-party tools, hosting, paid placements, a full redesign and new long-form articles are excluded. Quantified AI-answer monitoring is not included in these packages. Ongoing work is agreed month by month; this form does not start a subscription or take payment.</p>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-process">
        <p className="services-eyebrow">How delivery works</p><h2 id="services-process">Review. Build. Verify. Improve.</h2>
        <ol className="services-steps">{steps.map(([number, title, detail]) => <li className="surface" key={number}>
          <span className="services-step-number" aria-hidden="true">{number}</span><h3>{title}</h3><p>{detail}</p>
        </li>)}</ol>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-evidence">
        <div className="surface services-evidence">
          <div><p className="services-eyebrow">What you receive</p><h2 id="services-evidence">A handover your team can use.</h2>
            <p>Your handover separates implemented fixes and technical checks from organic traffic and observed AI mentions. A repaired issue can be verified immediately; search outcomes need their own dated evidence.</p></div>
          <div><h3>Illustrative handover example</h3><p>A product page has conflicting canonical tags. The agreed change removes the conflict. Verification records the deployed URL, resulting HTML and check date. This proves that repair; it does not prove a ranking or citation gain.</p><p className="services-note">Example only, not a customer case study.</p></div>
        </div>
        <div className="services-operator"><h3>Led by Ammar Ahmed, AEOCheck&apos;s founder.</h3><p>We review your platform and implementation requirements before agreeing an engagement. Work stays tied to your existing site, your approvals and an explicit handover.</p></div>
      </section>

      <section className="services-section launch-container" aria-labelledby="services-faq">
        <p className="services-eyebrow">Before you enquire</p><h2 id="services-faq">Questions before we start.</h2>
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
