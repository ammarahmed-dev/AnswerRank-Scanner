import type { Metadata, Viewport } from "next";
import Script from "next/script";
import BackToTop from "@/app/components/BackToTop";
import "./globals.css";

const HOME_TITLE = "AEOCheck - Free AEO & AI Search Readiness Scanner";
const HOME_DESCRIPTION =
  "Free AEO scanner. Check if ChatGPT, Perplexity & Google AI can find your site. Get a scored readiness report in 60 seconds. No signup needed.";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.aeocheck.co"),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  other: {
    keywords:
      "AEO checker, AI search readiness, answer engine optimization tool, LLM visibility scanner, AEO audit, GEO checker, AI SEO tool",
    "msvalidate.01": "9B4C2F424809ACD0BE84EEB08CB2B2BD",
  },
  alternates: {
    canonical: "https://www.aeocheck.co",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "https://www.aeocheck.co",
    siteName: "AEOCheck",
    type: "website",
    images: [
      {
        url: "https://www.aeocheck.co/api/og",
      },
      {
        url: "https://www.aeocheck.co/og-image.png",
      },
    ],
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    card: "summary_large_image",
    images: ["https://www.aeocheck.co/api/og", "https://www.aeocheck.co/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#00f0b4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&display=swap"
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NJN4LTVJ');`,
          }}
        />
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NJN4LTVJ"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
