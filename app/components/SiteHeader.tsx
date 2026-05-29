import AuthButton from "./AuthButton";
import AuditNavLink from "./AuditNavLink";

type Props = {
  scanCountLabel?: string;
};

export default function SiteHeader({ scanCountLabel }: Props) {
  return (
    <header className="site-header">
      <a href="/" className="brand-lockup" aria-label="AEOCheck home">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span className="brand-name">AEOCheck</span>
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="/#how">How it works</a>
        <a href="/#report">Report</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
        <a href="/monitor">Monitor</a>
        <AuditNavLink />
      </nav>
      <div className="header-actions">
        {scanCountLabel && <span className="header-pill">{scanCountLabel}</span>}
        <div className="header-action-buttons">
          <AuthButton />
          <span className="hidden md:inline-flex">
            <a href="/#scanner" className="btn btn-primary header-cta">Scan My Website</a>
          </span>
        </div>
      </div>
    </header>
  );
}


