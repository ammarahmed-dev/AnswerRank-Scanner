import { Building2, Code2, Rocket, Search } from "lucide-react";

const audiences = [
  {
    icon: Building2,
    title: "Agencies",
    body: "Create client-ready AI search audits in minutes and use them to start better SEO, content, and website optimization conversations.",
  },
  {
    icon: Search,
    title: "SEO Freelancers",
    body: "Find missing schema, unclear page structure, weak trust signals, and answer-readiness gaps before pitching fixes to clients.",
  },
  {
    icon: Code2,
    title: "Webflow & WordPress Developers",
    body: "Check pages for AI search readiness, metadata, headings, schema, and content clarity before client handoff.",
  },
  {
    icon: Rocket,
    title: "Founders & Small Teams",
    body: "See whether AI tools can clearly understand what your business does, who it helps, and why it should be recommended.",
  },
];

export default function WhoUsesSection() {
  return (
    <section className="who-uses-section">
      <div className="launch-container">
        <div className="section-intro">
          <p className="launch-eyebrow">Who uses AEOCheck?</p>
          <h2 className="section-heading">Built for the people who fix websites for a living</h2>
        </div>
        <div className="who-uses-grid">
          {audiences.map((audience) => (
            <article key={audience.title} className="who-uses-card">
              <div className="who-uses-icon" aria-hidden="true">
                <audience.icon size={18} />
              </div>
              <h3 className="who-uses-title">{audience.title}</h3>
              <p className="who-uses-body">{audience.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
