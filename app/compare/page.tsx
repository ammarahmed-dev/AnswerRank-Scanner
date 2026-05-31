import { Suspense } from "react";
import type { Metadata } from "next";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare URLs | AEOCheck",
  description: "Compare two URLs side by side to see which performs better for AI search visibility.",
};
export const dynamic = "force-dynamic";

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading...</span>
      </div>
    }>
      <CompareClient />
    </Suspense>
  );
}
