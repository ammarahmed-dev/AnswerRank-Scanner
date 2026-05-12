import { Suspense } from "react";
import type { Metadata } from "next";
import AuthPageClient from "../components/AuthPageClient";

export const metadata: Metadata = {
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

