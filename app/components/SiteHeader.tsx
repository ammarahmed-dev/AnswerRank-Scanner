import { Sparkles } from "lucide-react";
import AuthButton from "./AuthButton";

type Props = {
  scanCountLabel?: string;
};

export default function SiteHeader({ scanCountLabel }: Props) {
  return (
    <header className="site-header">
      <a href="/" className="brand-lockup" aria-label="AnswerRank home">
        <span className="brand-mark"><Sparkles className="h-5 w-5" /></span>
        <span>
          <span className="brand-name">AnswerRank</span>
          <span className="brand-subtitle">AI visibility scanner</span>
        </span>
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="/#how">How it works</a>
        <a href="/#report">Report</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
      </nav>
      <div className="header-actions">
        {scanCountLabel && <span className="header-pill">{scanCountLabel}</span>}
        <div className="header-action-buttons">
          <AuthButton />
          <a href="/#scanner" className="btn btn-primary header-cta">Scan now</a>
        </div>
      </div>
    </header>
  );
}
