import AuthButton from "./AuthButton";
import FeaturesDropdown from "./FeaturesDropdown";

type Props = {
  scanCountLabel?: string;
};

export default function SiteHeader({ scanCountLabel: _ }: Props) {
  return (
    <header className="site-header">
      <a href="/" className="brand-lockup" aria-label="AEOCheck home">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span className="brand-name">AEOCheck</span>
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="/#how">How it works</a>
        <FeaturesDropdown />
        <a href="/blog">Blog</a>
        <a href="/pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
      </nav>
      <div className="header-actions">
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
