import type { Metadata } from "next";
import DashboardWrapper from "./DashboardWrapper";

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

export default function DashboardPage() {
  return <DashboardWrapper />;
}

