import Link from "next/link";
import AuthButton from "./AuthButton";
import FeaturesDropdown from "./FeaturesDropdown";

type Props = {
  scanCountLabel?: string;
};

export default function SiteHeader({ scanCountLabel: _ }: Props) {
  return (
    <header className="site-header">
      <Link href="/" className="brand-lockup" aria-label="AEOCheck home">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span className="brand-name">AEOCheck</span>
      </Link>
      <nav className="site-nav" aria-label="Primary navigation">
        <Link href="/#how">How it works</Link>
        <FeaturesDropdown />
        <Link href="/blog">Blog</Link>
        <a href="/pricing">Pricing</a>
        <Link href="/#faq">FAQ</Link>
      </nav>
      <div className="header-actions">
        <div className="header-action-buttons">
          <AuthButton />
          <span className="hidden md:inline-flex">
            <Link href="/#scanner" className="btn btn-primary header-cta">Scan My Website</Link>
          </span>
        </div>
      </div>
    </header>
  );
}
