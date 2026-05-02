import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AnswerRank Scanner — AI Visibility Readiness Report",
  description:
    "Check if your website is ready for AI search engines, answer engines, and LLM-based discovery. Get a free AI Visibility Readiness Report instantly.",
  keywords: ["AI SEO", "answer engine optimization", "LLM visibility", "AI search"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
