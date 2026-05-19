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
        </div>
        <div className="footer-links-wrap">
          <div className="footer-link-group">
            <p className="footer-group-label">PRODUCT</p>
            <div className="footer-link-list">
              <a href="/">Home</a>
              <a href="/blog">Blog</a>
              <a href="/#scanner">Scanner</a>
              <a href="/#how">How It Works</a>
              <a href="/#pricing">Pricing</a>
              <a href="/#faq">FAQ</a>
              <a href="/contact">Contact</a>
            </div>
          </div>
          <div className="footer-link-group">
            <p className="footer-group-label">COMPANY</p>
            <div className="footer-link-list">
              <a href="/about">About</a>
              <a href="/team">Team</a>
              <a href="/sample-report">Sample Report</a>
              <a href="/sitemap">Sitemap</a>
            </div>
          </div>
          <div className="footer-link-group">
            <p className="footer-group-label">COMPARE</p>
            <div className="footer-link-list">
              <a href="/vs/otterly">vs Otterly</a>
              <a href="/vs/semrush-ai">vs Semrush AI</a>
              <a href="/vs/peec-ai">vs Peec AI</a>
              <a href="/vs/profound">vs Profound</a>
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




