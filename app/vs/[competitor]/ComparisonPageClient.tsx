"use client";

import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { Competitor } from "../competitors";

interface Props {
  data: Competitor;
}

export default function ComparisonPageClient({ data }: Props) {
  const quickSummaryCards = data.quickSummary?.slice(0, 2) ?? [];
  const quickSummaryTakeaway = data.quickSummary?.[2];
  const auditCards = data.auditVsMonitoring?.slice(0, 2) ?? [];
  const auditTakeaway = data.auditVsMonitoring?.[2];

  return (
    <main className="min-h-screen">
      <SiteHeader />

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

      <section className="launch-section">
        <div className="launch-container vs-verdict-grid">
          <div className="vs-verdict-card vs-verdict-us">
            <p className="launch-eyebrow">AEOCheck</p>
            <p className="vs-price">$0 / $9 / $39</p>
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

      {data.quickSummary && data.quickSummary.length > 0 && (
        <section className="launch-section muted-section">
          <div className="launch-container">
            <div className="section-intro">
              <h2>AEOCheck vs Peec AI: quick summary</h2>
            </div>
            <div className="vs-wins-grid">
              {quickSummaryCards[0] && (
                <article className="vs-wins-card vs-wins-us">
                  <p className="launch-eyebrow">AEOCheck</p>
                  <h3>Fast page-level diagnosis</h3>
                  <p className="vs-card-body">{quickSummaryCards[0]}</p>
                </article>
              )}
              {quickSummaryCards[1] && (
                <article className="vs-wins-card vs-wins-them">
                  <p className="launch-eyebrow">Peec AI</p>
                  <h3>Ongoing visibility analytics</h3>
                  <p className="vs-card-body">{quickSummaryCards[1]}</p>
                </article>
              )}
            </div>
            {quickSummaryTakeaway && (
              <div className="vs-wins-card vs-note-card">
                <p>{quickSummaryTakeaway}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {(data.aeocheckBest || data.competitorBest) && (
        <section className="launch-section">
          <div className="launch-container vs-wins-grid">
            {data.aeocheckBest && (
              <div className="vs-wins-card vs-wins-us">
                <h3>What AEOCheck does best</h3>
                <ul>
                  {data.aeocheckBest.map((item) => (
                    <li key={item}>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.competitorBest && (
              <div className="vs-wins-card vs-wins-them">
                <h3>What {data.name} does best</h3>
                <ul>
                  {data.competitorBest.map((item) => (
                    <li key={item}>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {data.auditVsMonitoring && (
        <section className="launch-section muted-section">
          <div className="launch-container">
            <div className="section-intro">
              <h2>Page-level AEO audit vs AI visibility monitoring</h2>
            </div>
            <div className="vs-wins-grid">
              {auditCards[0] && (
                <article className="vs-wins-card vs-wins-us">
                  <p className="launch-eyebrow">AEO audit</p>
                  <h3>Checks page readiness quality</h3>
                  <p className="vs-card-body">{auditCards[0]}</p>
                </article>
              )}
              {auditCards[1] && (
                <article className="vs-wins-card vs-wins-them">
                  <p className="launch-eyebrow">AI visibility monitoring</p>
                  <h3>Tracks mention performance over time</h3>
                  <p className="vs-card-body">{auditCards[1]}</p>
                </article>
              )}
            </div>
            <div className="vs-wins-card vs-note-card">
              <p>{auditTakeaway ?? "Most teams start with an audit first because it reveals immediate fixes before long-term monitoring."}</p>
            </div>
          </div>
        </section>
      )}

      {(data.chooseAeocheckIf || data.chooseCompetitorIf) && (
        <section className="launch-section">
          <div className="launch-container vs-wins-grid">
            {data.chooseAeocheckIf && (
              <div className="vs-wins-card vs-wins-us">
                <h3>Which tool should you choose?</h3>
                <p><strong>Choose AEOCheck if:</strong></p>
                <ul>
                  {data.chooseAeocheckIf.map((item) => (
                    <li key={item}>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.chooseCompetitorIf && (
              <div className="vs-wins-card vs-wins-them">
                <h3>Choose {data.name} if:</h3>
                <ul>
                  {data.chooseCompetitorIf.map((item) => (
                    <li key={item}>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

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
          {data.tableTakeaway && (
            <div className="vs-table-takeaway-card">
              <p className="vs-table-takeaway">{data.tableTakeaway}</p>
            </div>
          )}
        </div>
      </section>

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

      <section className="launch-section vs-cta-section">
        <div className="launch-container vs-cta-block">
          <p className="launch-eyebrow">Try it free</p>
          <h2>Start with a free AEO scan</h2>
          <p>Run a free AEOCheck scan to see whether your website gives ChatGPT, Perplexity, and Google AI enough context to understand and cite your page.</p>
          {data.ctaSupportLine && <p className="vs-cta-support">{data.ctaSupportLine}</p>}
          <p>
            <a href="/sample-report">View sample report</a> | <a href="/blog/what-is-aeo-answer-engine-optimization">Read what AEO means</a> | <a href="/blog/best-aeo-tools-ai-search-visibility">Compare AEO tools</a> | <a href="/pricing">See pricing</a>
          </p>
          <a href="/#scanner" className="btn btn-primary">
            Run Free Scan <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {data.faqs && data.faqs.length > 0 && (
        <section className="launch-section muted-section">
          <div className="launch-container">
            <div className="section-intro">
              <p className="launch-eyebrow">FAQ</p>
              <h2>Common questions about AEOCheck vs {data.name}</h2>
            </div>
            <div className="vs-faq-list">
              <ul>
                {data.faqs.map((item) => (
                  <li key={item.q} className="vs-faq-item">
                    <strong>{item.q}</strong>
                    <p>{item.a}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}

