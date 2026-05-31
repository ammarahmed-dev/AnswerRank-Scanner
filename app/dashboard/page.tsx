import { Suspense } from "react";
import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

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
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading...</span>
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}

