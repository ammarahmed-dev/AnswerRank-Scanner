import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Compare URLs | AEOCheck",
  description: "Compare two URLs side by side to see which performs better for AI search visibility.",
};

const CompareClient = dynamic(
  () => import("./CompareClient"),
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

export default function ComparePage() {
  return <CompareClient />;
}
