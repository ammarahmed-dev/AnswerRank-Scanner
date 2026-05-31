import type { Metadata } from "next";
import CompareWrapper from "./CompareWrapper";

export const metadata: Metadata = {
  title: "Compare URLs | AEOCheck",
  description: "Compare two URLs side by side to see which performs better for AI search visibility.",
};

export default function ComparePage() {
  return <CompareWrapper />;
}
