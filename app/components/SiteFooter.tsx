import Link from "next/link";
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="launch-container footer-grid">
        <div>
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">A</span>
            <span className="brand-name">AEOCheck</span>
          </div>
          <p>&copy; 2026 AEOCheck. All rights reserved.</p>
          <p className="footer-contact-email">
            <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a>
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-ink-muted)", marginTop: 6 }}>
            Built by the <a href="/about" style={{ color: "inherit", textDecoration: "underline" }}>AEOCheck Team</a>
          </p>
        </div>
        <div className="footer-links-wrap">
          <div className="footer-link-group">
            <p className="footer-group-label">PRODUCT</p>
            <div className="footer-link-list">
              <Link href="/">Home</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/#scanner">Scanner</Link>
              <Link href="/#how">How It Works</Link>
              <a href="/pricing">Pricing</a>
              <Link href="/#faq">FAQ</Link>
              <a href="/contact">Contact</a>
            </div>
          </div>
          <div className="footer-link-group">
            <p className="footer-group-label">COMPANY</p>
            <div className="footer-link-list">
              <a href="/about">About</a>
              <a href="/team">Team</a>
              <a href="/sample-report">Sample Report</a>
              <Link href="/tools/llms-txt-generator">llms.txt Generator</Link>
              <Link href="/tools/ai-crawler-checker">AI Crawler Checker</Link>
              <a href="/sitemap">Sitemap</a>
            </div>
          </div>
          <div className="footer-link-group">
            <p className="footer-group-label">COMPARE</p>
            <div className="footer-link-list">
              <Link href="/vs/otterly">vs Otterly</Link>
              <Link href="/vs/semrush-ai">vs Semrush AI</Link>
              <Link href="/vs/peec-ai">vs Peec AI</Link>
              <Link href="/vs/profound">vs Profound</Link>
            </div>
          </div>
          <div className="footer-link-group">
            <p className="footer-group-label">LEGAL</p>
            <div className="footer-link-list">
              <a href="/privacy-policy">Privacy Policy</a>
              <a href="/terms-of-service">Terms of Service</a>
              <a href="/refund-policy">Refund Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}




