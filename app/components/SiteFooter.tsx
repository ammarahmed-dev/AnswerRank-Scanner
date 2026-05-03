import { Sparkles } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="launch-container footer-grid">
        <div>
          <div className="brand-lockup">
            <span className="brand-mark"><Sparkles className="h-5 w-5" /></span>
            <span>
              <span className="brand-name">AnswerRank</span>
              <span className="brand-subtitle">AI visibility scanner</span>
            </span>
          </div>
          <p>One-page SaaS MVP for AI visibility readiness reports.</p>
        </div>
        <div>
          <a href="/#scanner">Scanner</a>
          <a href="/#how">How it works</a>
          <a href="/#pricing">Pricing</a>
        </div>
      </div>
    </footer>
  );
}
