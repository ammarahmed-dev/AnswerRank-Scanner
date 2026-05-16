import { Suspense } from "react";
import type { Metadata } from "next";
import AuthPageClient from "../components/AuthPageClient";

export const metadata: Metadata = {
  title: "Log In to Your AEOCheck Account",
  description: "Log in to your AEOCheck account to view your AI visibility reports and manage your plan.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageClient mode="login" />
    </Suspense>
  );
}

