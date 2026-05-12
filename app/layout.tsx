import type { Metadata } from "next";
import "./globals.css";

const HOME_TITLE = "AEOCheck — Free AEO & AI Search Readiness Scanner";
const HOME_DESCRIPTION =
  "Check if your website is ready for AI search engines like ChatGPT, Perplexity, and Google AI Overviews. Get a free AEO readiness score in 60 seconds. No signup required.";

export const metadata: Metadata = {
  metadataBase: new URL("https://aeocheck.co"),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  other: {
    keywords:
      "AEO checker, AI search readiness, answer engine optimization tool, LLM visibility scanner, AEO audit, GEO checker, AI SEO tool",
  },
  alternates: {
    canonical: "https://aeocheck.co",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "https://aeocheck.co",
    siteName: "AEOCheck",
    type: "website",
    images: [
      {
        url: "https://aeocheck.co/api/og",
      },
      {
        url: "https://aeocheck.co/og-image.png",
      },
    ],
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    card: "summary_large_image",
    images: ["https://aeocheck.co/api/og", "https://aeocheck.co/og-image.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://api.openai.com" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
