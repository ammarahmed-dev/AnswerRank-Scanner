import { Suspense } from "react";
import type { Metadata } from "next";
import ScanClient from "./ScanClient";

export const metadata: Metadata = {
  title: "Scan a URL | AEOCheck",
  description: "Check how visible your website is to ChatGPT, Perplexity, and other AI search engines.",
};

export default function ScanPage() {
  return (
    <Suspense>
      <ScanClient />
    </Suspense>
  );
}
