import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { STUDY_DATE, STUDY_SITES, computeStats, pct } from "@/lib/ai-readiness-study";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Readiness Study: How 85 Major Sites Treat AI Crawlers | AEOCheck",
  description:
    "We checked robots.txt, llms.txt and structured data on 85 well-known SaaS, media, ecommerce and AI sites. See who blocks AI search crawlers and who publishes llms.txt.",
  path: "/research/ai-readiness-study",
});

const CATEGORIES = ["SaaS", "Media", "Ecommerce", "AI companies"];

export default function AiReadinessStudyPage() {
  const all = computeStats(STUDY_SITES);
  const rows = CATEGORIES.map((category) => {
    const sites = STUDY_SITES.filter((s) => s.category === category);
    return { category, ...computeStats(sites) };
  });
  const searchBlockers = STUDY_SITES.filter((s) => s.blocksSearchCrawler).map((s) => s.domain);

  const findings = [
    `${all.llmsTxt} of ${all.total} sites (${pct(all.llmsTxt, all.total)}%) publish an llms.txt file. Adoption is concentrated in software companies: ${rows[0].llmsTxt} of ${rows[0].total} SaaS sites have one, against ${rows[1].llmsTxt} of ${rows[1].total} media sites.`,
    `${all.blocksGptbot} of ${all.robotsChecked} readable robots.txt files (${pct(all.blocksGptbot, all.robotsChecked)}%) block GPTBot, OpenAI's training crawler. Media sites account for most of them (${rows[1].blocksGptbot} of ${rows[1].robotsChecked}).`,
    `${all.blocksSearchCrawler} of ${all.robotsChecked} (${pct(all.blocksSearchCrawler, all.robotsChecked)}%) block at least one AI search crawler (OAI-SearchBot, PerplexityBot or Claude-SearchBot). Blocking those is the choice that removes a site from that engine's answers.`,
    `${all.organizationSchema} of ${all.homepagesChecked} homepages (${pct(all.organizationSchema, all.homepagesChecked)}%) declare Organization-type JSON-LD, and only ${all.faqSchema} (${pct(all.faqSchema, all.homepagesChecked)}%) have FAQPage markup on the homepage.`,
  ];

  const faqs = [
    {
      q: "How was the data collected?",
      a: `On ${STUDY_DATE} we fetched each site's /robots.txt, /llms.txt and homepage over plain HTTPS from one server, and parsed them with the same robots.txt rules AEOCheck's scanner uses. The script is in the AEOCheck repository (scripts/ai-readiness-study.mjs) and the raw results are in data/ai-readiness-study.json.`,
    },
    {
      q: "Is this a representative sample?",
      a: "No. The list is 85 well-known sites we picked by hand across four categories. It shows how prominent sites behave, not the whole web. Sites whose robots.txt or homepage our request could not read (bot protection, redirects, errors) are excluded from the matching percentages, which is why the denominators differ.",
    },
    {
      q: "Does blocking an AI crawler mean a site is not cited?",
      a: "Not necessarily. Robots.txt is one signal. Some systems also use licensed data or other crawlers, and robots.txt is advisory. Blocking an AI search crawler does remove the site from that engine's own crawl, which is the relevant risk for visibility.",
    },
    {
      q: "Does having llms.txt improve AI visibility?",
      a: "We make no such claim. The data shows who publishes the file, not what it earns them. It is a low-cost way to give AI systems a summary of your site, and the free llms.txt generator builds one in a minute.",
    },
  ];

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "AI readiness signals on 85 well-known websites",
      description: "robots.txt AI crawler rules, llms.txt presence and homepage structured data for 85 hand-picked sites.",
      url: `${SITE_URL}/research/ai-readiness-study`,
      dateModified: STUDY_DATE,
      creator: { "@type": "Organization", name: "AEOCheck", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Research · {STUDY_DATE}</p>
            <h1>How {all.total} Major Sites Treat AI Crawlers</h1>
            <p>
              We checked robots.txt, llms.txt and homepage structured data on {all.total} well-known SaaS, media,
              ecommerce and AI sites. Here is what stood out.
            </p>
          </div>

          <div className="llms-tool-faq">
            <h2>Key findings</h2>
            <ul>
              {findings.map((f) => (
                <li key={f}><p>{f}</p></li>
              ))}
            </ul>
          </div>

          <div className="surface report-card" style={{ overflowX: "auto" }}>
            <h2 className="section-heading">By category</h2>
            <table className="study-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Sites</th>
                  <th>Publish llms.txt</th>
                  <th>Block GPTBot</th>
                  <th>Block an AI search crawler</th>
                  <th>Organization schema</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.category}>
                    <td>{r.category}</td>
                    <td>{r.total}</td>
                    <td>{r.llmsTxt} ({pct(r.llmsTxt, r.total)}%)</td>
                    <td>{r.blocksGptbot} of {r.robotsChecked}</td>
                    <td>{r.blocksSearchCrawler} of {r.robotsChecked}</td>
                    <td>{r.organizationSchema} of {r.homepagesChecked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="llms-tool-faq">
            <h2>Sites that block an AI search crawler</h2>
            <p>{searchBlockers.join(", ")}.</p>
            <p>
              Whether that is a deliberate licensing decision or a leftover rule, the effect is the same: the
              blocked engine cannot fetch those pages for its answers. Check your own file with the{" "}
              <Link href="/tools/ai-crawler-checker">AI crawler checker</Link>.
            </p>
            <h2>What to take from this</h2>
            <p>
              Publishers often block on purpose. A business that wants to be recommended should not. If your
              robots.txt came from a template, a CDN default or an old security rule, confirm that it lets AI search
              crawlers in, then build a clean one with the <Link href="/tools/robots-txt-generator">robots.txt generator</Link>.
              Publish an <Link href="/tools/llms-txt-generator">llms.txt</Link> and add{" "}
              <Link href="/tools/organization-schema-generator">Organization schema</Link> to your homepage.
            </p>
          </div>
          <p style={{ textAlign: "center" }}>
            <Link href="/#scanner" className="btn btn-primary">Scan your site free</Link>
          </p>

          <div className="llms-tool-faq">
            <h2>Method and limits</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>Want to cite this? Link to this page and name AEOCheck and the date above.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
