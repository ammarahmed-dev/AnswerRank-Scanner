import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Scan a URL | AEOCheck",
  description: "Check how visible your website is to ChatGPT, Perplexity, and other AI search engines.",
};

const ScanClient = dynamic(
  () => import("./ScanClient"),
  {
    ssr: false,
    loading: () => (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading...</span>
      </div>
    ),
  }
);

export default function ScanPage() {
  return <ScanClient />;
}
