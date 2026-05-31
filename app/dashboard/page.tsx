import type { Metadata } from "next";
import dynamic from "next/dynamic";

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

const DashboardClient = dynamic(
  () => import("./DashboardClient"),
  {
    ssr: false,
    loading: () => (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading your workspace...</span>
      </div>
    ),
  }
);

export default function DashboardPage() {
  return <DashboardClient />;
}

