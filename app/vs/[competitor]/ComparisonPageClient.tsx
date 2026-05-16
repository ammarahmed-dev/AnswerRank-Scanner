"use client";

import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { Competitor } from "../competitors";

interface Props {
  data: Competitor;
}

export default function ComparisonPageClient({ data }: Props) {
  return (
    <main className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="vs-hero">
        <div className="launch-container">
          <p className="launch-eyebrow">AEOCheck vs {data.name}</p>
          <h1 className="vs-hero-heading">{data.heroHeading}</h1>
          <p className="vs-hero-sub">{data.heroSubheading}</p>
          <div className="vs-hero-ctas">
            <a href="/#scanner" className="btn btn-primary">
              Run Free Scan <ArrowRight className="h-4 w-4" />
            </a>
            {data.url && (
              <a href={data.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                Visit {data.name}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="launch-section">
        <div className="launch-container vs-verdict-grid">
          <div className="vs-verdict-card vs-verdict-us">
            <p className="launch-eyebrow">AEOCheck</p>
            <p className="vs-price">$0 / $14 / $39</p>
            <p className="vs-target">For agencies, freelancers, and developers</p>
          </div>
          <div className="vs-verdict-divider">VS</div>
          <div className="vs-verdict-card vs-verdict-them">
            <p className="launch-eyebrow">{data.name}</p>
            <p className="vs-price">{data.price}</p>
            <p className="vs-target">For {data.targetUser}</p>
          </div>
        </div>
        <div className="launch-container vs-verdict-text">
          <p>{data.verdict}</p>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="launch-section muted-section">
        <div className="launch-container">
          <div className="section-intro">
            <p className="launch-eyebrow">Feature comparison</p>
            <h2>How AEOCheck and {data.name} compare</h2>
          </div>
          <div className="vs-table-wrap mt-4">
            <table className="vs-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>AEOCheck</th>
                  <th>{data.name}</th>
                </tr>
              </thead>
              <tbody>
                {data.features.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>
                      {row.aeocheck === true ? (
                        <CheckCircle2 className="vs-check h-4 w-4" />
                      ) : row.aeocheck === false ? (
                        <XCircle className="vs-cross h-4 w-4" />
                      ) : (
                        <span className="vs-partial">{row.aeocheck}</span>
                      )}
                    </td>
                    <td>
                      {row.competitor === true ? (
                        <CheckCircle2 className="vs-check h-4 w-4" />
                      ) : row.competitor === false ? (
                        <XCircle className="vs-cross h-4 w-4" />
                      ) : (
                        <span className="vs-partial">{row.competitor}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* They win at / We win at */}
      <section className="launch-section">
        <div className="launch-container vs-wins-grid">
          <div className="vs-wins-card vs-wins-us">
            <h3>Where AEOCheck wins</h3>
            <ul>
              {data.weWinAt.map((item) => (
                <li key={item}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="vs-wins-card vs-wins-them">
            <h3>Where {data.name} wins</h3>
            <ul>
              {data.theyWinAt.map((item) => (
                <li key={item}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="launch-section vs-cta-section">
        <div className="launch-container vs-cta-block">
          <p className="launch-eyebrow">Try it free</p>
          <h2>Run a free AEO scan in 60 seconds</h2>
          <p>No signup. No credit card. Paste any public URL and get your AI visibility score instantly.</p>
          <a href="/#scanner" className="btn btn-primary">
            Run Free Scan <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
