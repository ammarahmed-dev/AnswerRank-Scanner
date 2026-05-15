import { Sparkles } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="launch-container footer-grid">
        <div>
          <div className="brand-lockup">
            <span className="brand-mark"><Sparkles className="h-5 w-5" /></span>
            <span>
              <span className="brand-name">AEOCheck</span>
              <span className="brand-subtitle">Free AEO & AI search readiness scanner.</span>
            </span>
          </div>
          <p>&copy; 2025 AEOCheck. All rights reserved.</p>
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
              <a href="/#contact">Contact</a>
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




