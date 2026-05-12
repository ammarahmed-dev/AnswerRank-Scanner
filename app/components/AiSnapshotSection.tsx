export default function AiSnapshotSection() {
  return (
    <section className="launch-section snapshot-section">
      <div className="launch-container">
        <div className="snapshot-grid">
          <div className="snapshot-intro">
            <p className="launch-eyebrow">AI Answer Snapshot</p>
            <h2>See exactly how AI describes your brand</h2>
            <p className="snapshot-subheading">
              Every full report includes a live snapshot of how AI assistants like ChatGPT and Perplexity currently understand your page and
              what&apos;s holding them back from citing you.
            </p>

            <div className="snapshot-features">
              <div className="snapshot-feature">
                <div className="snapshot-feature-icon">🤖</div>
                <div>
                  <div className="snapshot-feature-title">AI Summary</div>
                  <div className="snapshot-feature-desc">See the exact summary an AI assistant would generate about your page right now.</div>
                </div>
              </div>

              <div className="snapshot-feature">
                <div className="snapshot-feature-icon">🎯</div>
                <div>
                  <div className="snapshot-feature-title">Confidence Score</div>
                  <div className="snapshot-feature-desc">
                    Know whether AI engines have high, medium, or low confidence in understanding your content.
                  </div>
                </div>
              </div>

              <div className="snapshot-feature">
                <div className="snapshot-feature-icon">⚠️</div>
                <div>
                  <div className="snapshot-feature-title">Missing Context</div>
                  <div className="snapshot-feature-desc">
                    Discover what information AI engines can&apos;t find on your page that would help them cite you accurately.
                  </div>
                </div>
              </div>

              <div className="snapshot-feature">
                <div className="snapshot-feature-icon">⚡</div>
                <div>
                  <div className="snapshot-feature-title">Next Best Improvement</div>
                  <div className="snapshot-feature-desc">
                    Get one specific, high-impact fix that will immediately improve how AI engines understand your page.
                  </div>
                </div>
              </div>
            </div>

            <p className="snapshot-cta-note">
              Included in every Full Report - <a href="#scanner">run a free scan</a> to see your AI Answer Snapshot.
            </p>
          </div>

          <div className="snapshot-mockup-card">
            <div className="snapshot-mockup-header">
              <span className="snapshot-mockup-title">AI Answer Snapshot</span>
              <span className="snapshot-mockup-subtitle">How an AI assistant may understand this page</span>
            </div>

            <div className="snapshot-mockup-grid">
              <div className="snapshot-mockup-cell">
                <div className="snapshot-mockup-label">IF AI SUMMARIZED THIS PAGE</div>
                <div className="snapshot-mockup-text">
                  The page is well-optimised for AI search with clear metadata and structured data. Strong schema coverage gives AI engines
                  the context needed to accurately cite and summarise this content.
                </div>
              </div>

              <div className="snapshot-mockup-cell">
                <div className="snapshot-mockup-label">CONFIDENCE</div>
                <div className="snapshot-confidence-badge">High confidence</div>
                <div className="snapshot-mockup-text">
                  The page gives AI systems enough clear signals to understand the core topic.
                </div>
              </div>

              <div className="snapshot-mockup-cell">
                <div className="snapshot-mockup-label">MISSING CONTEXT</div>
                <div className="snapshot-mockup-text">
                  No critical context gaps detected. Consider adding an About section with team and company details for richer entity
                  recognition.
                </div>
              </div>

              <div className="snapshot-mockup-cell">
                <div className="snapshot-mockup-label">NEXT BEST IMPROVEMENT</div>
                <div className="snapshot-mockup-text">
                  Add BreadcrumbList schema to improve navigation structure understanding across AI crawlers.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
