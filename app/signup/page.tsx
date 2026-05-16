import { Suspense } from "react";
import type { Metadata } from "next";
import AuthPageClient from "../components/AuthPageClient";

export const metadata: Metadata = {
  title: "Sign Up Free for AEOCheck AI Scanner",
  description: "Create a free AEOCheck account to scan your website for AI search readiness and get your visibility score.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageClient mode="signup" />
    </Suspense>
  );
}

