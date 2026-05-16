import { Suspense } from "react";
import type { Metadata } from "next";
import AuthPageClient from "../components/AuthPageClient";

export const metadata: Metadata = {
  title: "Log In | AEOCheck",
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

