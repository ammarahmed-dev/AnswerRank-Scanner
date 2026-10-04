import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle,
  Code,
  FileArchive,
  FileArrowDown,
  FileMagnifyingGlass,
  Gauge,
  MagnifyingGlass,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import type { BlogPostMeta } from "@/lib/blog";
import AiSnapshotSection from "./AiSnapshotSection";
import WhoUsesSection from "./WhoUsesSection";

// Static homepage sections rendered on the server so they add no hydration work to the scanner
// client component. Rendered between the hero and the testimonials/pricing sections.

const trustStats = [
  { value: "5,700+", label: "Scans run", text: "Over 5,700 websites have been scanned for AEO and AI search readiness using AEOCheck." },
  { value: "25", label: "AI visibility checks", text: "Every scan covers 25 AEO and GEO checks across schema, metadata, content clarity, trust signals, and AI readiness." },
  { value: "PDF", label: "Client-ready", text: "Every paid report exports as a branded PDF you can share with clients directly." },
  { value: "60s", label: "Scan time", text: "Paste a URL and get a scored AI readiness report in under 60 seconds. No installation needed." },
];

const auditSignals = [
  { icon: FileMagnifyingGlass, title: "Metadata clarity", text: "Checks your title, description, Open Graph tags, and heading structure. These are the signals AI uses to understand a page." },
  { icon: Code, title: "Structured data", text: "Finds existing JSON-LD schema and flags missing types. Shows you the markup that will have the biggest impact on AI visibility." },
  { icon: Sparkle, title: "Answer readiness", text: "Scores how well your page is set up for AI tools to read, summarize, and cite its content in answers." },
  { icon: Gauge, title: "Priority scoring", text: "A weighted 0-100 score broken down by category. You know exactly where to focus first." },
  { icon: FileArrowDown, title: "Content clarity", text: "Checks whether your page clearly explains who you are, what you offer, who you help, and why AI systems should trust the answer." },
  { icon: FileArchive, title: "Trust signals", text: "Checks for entity, business, contact, and credibility signals that help AI systems understand and cite your brand." },
];

const workflow = [
  {
    title: "Paste a public website URL",
    text: "Enter any public URL. AEOCheck fetches the live page content, metadata, and HTML structure in real time. No browser extension or installation needed.",
  },
  {
    title: "Read every page signal",
    text: "The scanner reads your metadata, schema markup, and content structure. It runs 25 AEO and GEO checks that AI engines use to cite your page.",
  },
  {
    title: "Score your AI visibility",
    text: "Each signal gets a score across metadata, schema, headings, clarity, trust, and performance. Your total AI visibility score shows how well answer engines can read, understand, and cite your page.",
  },
  {
    title: "Act on the highest-impact fixes",
    text: "The report ranks every issue by impact so you know what to fix first. Each issue includes a plain-English explanation and a specific fix you can use right away.",
  },
];

export default function HomeStaticSections({ latestPosts }: { latestPosts: BlogPostMeta[] }) {
  return (
    <>
        <section className="stats-band">
          <div className="launch-container stats-grid">
            {trustStats.map(({ value, label, text }) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="what-we-do-section launch-section muted-section">
          <div className="launch-container">
            <div className="section-intro">
              <p className="launch-eyebrow">What we do</p>
              <h2>We tell you exactly how AI engines see your website.</h2>
            </div>
            <div className="what-we-do-grid">
              <div className="what-we-do-card">
                <h3>AI visibility scanning</h3>
                <p>Paste any public URL. AEOCheck scans the live page for AI search readiness signals and returns a scored AEO report in under 60 seconds.</p>
              </div>
              <div className="what-we-do-card">
                <h3>25-point readiness checks</h3>
                <p>Every scan covers 25 checks across metadata, schema, headings, and more. You get a full picture in one place.</p>
              </div>
              <div className="what-we-do-card">
                <h3>Actionable recommendations</h3>
                <p>Each issue comes with a plain-English explanation and a specific fix you can use right away. Issues are ranked by impact so you always know what to tackle first.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="image-story-section">
          <div className="launch-container image-story-grid">
            <div className="answer-map-visual" aria-label="AI visibility signal map">
              <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
                <line x1="50%" y1="44%" x2="20%" y2="20%" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
                <line x1="50%" y1="44%" x2="76%" y2="22%" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
                <line x1="50%" y1="44%" x2="18%" y2="66%" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
                <line x1="50%" y1="44%" x2="74%" y2="66%" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
              </svg>
              <div className="answer-node answer-node-primary">
                <MagnifyingGlass weight="duotone" className="h-5 w-5" />
                <strong>AI Search</strong>
              </div>
              <div className="signal-orbit">
                <span style={{ "--x": "16%", "--y": "16%" } as CSSProperties}>Metadata</span>
                <span style={{ "--x": "70%", "--y": "18%" } as CSSProperties}>Schema</span>
                <span style={{ "--x": "10%", "--y": "60%" } as CSSProperties}>Performance</span>
                <span style={{ "--x": "62%", "--y": "60%" } as CSSProperties}>Trust Signals</span>
              </div>
              <div className="answer-card-preview">
                <p>Readiness score</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <strong style={{ margin: 0 }}>83/100</strong>
                  <span style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", borderRadius: "999px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700 }}>Strong</span>
                </div>
                <small>3 priority fixes identified</small>
              </div>
            </div>
            <div className="story-content">
              <p className="launch-eyebrow">Why it matters</p>
              <h2>Search is becoming answer-first. Your site needs machine-readable proof.</h2>
              <p>
                More buyers now discover brands through AI tools like ChatGPT, Perplexity, and Google AI results. AEOCheck shows whether your page gives those systems enough context to understand, summarize, and cite your business.
              </p>
              <p>Learn how we score your AEO readiness in our <a href="/sample-report" style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "none" }}>sample report.</a></p>
              <div className="story-checks">
                <span><CheckCircle weight="fill" className="h-4 w-4" /> Brand and entity clarity</span>
                <span><CheckCircle weight="fill" className="h-4 w-4" /> Structured data coverage</span>
                <span><CheckCircle weight="fill" className="h-4 w-4" /> Recommended answer blocks</span>
              </div>
            </div>
          </div>
        </section>

        <section className="launch-section" id="how">
          <div className="launch-container">
            <div className="section-intro">
              <p className="launch-eyebrow">How it works</p>
              <h2>From one URL to a practical AI visibility report.</h2>
            </div>
            <div className="process-list">
              {workflow.map((item, index) => (
                <div key={item.title} className="process-item">
                  <span>{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <WhoUsesSection />

        <AiSnapshotSection />

        <section className="launch-section muted-section">
          <div className="launch-container">
            <div className="section-intro">
              <p className="launch-eyebrow">What the audit checks</p>
              <h2>7 readiness areas, translated into business-friendly actions.</h2>
            </div>
            <div className="signal-grid">
              {auditSignals.map(({ icon: Icon, title, text }) => (
                <article key={title} className="signal-row">
                  <Icon weight="duotone" className="h-5 w-5" />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="launch-section featured-guides-section" aria-labelledby="featured-guides-heading">
          <div className="launch-container">
            <div className="section-intro">
              <p className="launch-eyebrow">AEO Guides</p>
              <h2 id="featured-guides-heading">Learn how AI search visibility works</h2>
              <p className="featured-guides-description">
                Practical guides on AEO, AI search readiness, ChatGPT visibility, schema, and website optimization for answer engines.
              </p>
            </div>

            <div className="featured-guides-grid">
              {latestPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="featured-guide-card">
                  <div style={{ height: 160, overflow: "hidden", borderRadius: 8, marginBottom: 12, flexShrink: 0 }}>
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={post.coverImageAlt ?? post.title}
                        width={480}
                        height={160}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "rgba(0, 240, 180, 0.08)", border: "1px solid rgba(0, 240, 180, 0.15)" }} />
                    )}
                  </div>
                  <span className="featured-guide-pill">{post.tags[0] ?? "Guide"}</span>
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                  <span className="featured-guide-link">Read guide</span>
                </Link>
              ))}
            </div>

            <div className="featured-guides-cta-row">
              <Link href="/blog" className="btn btn-secondary featured-guides-cta-link">Read more AI search guides</Link>
            </div>
          </div>
        </section>
    </>
  );
}
