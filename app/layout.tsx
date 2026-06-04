import type { Metadata, Viewport } from "next";
import Script from "next/script";
import BackToTop from "@/app/components/BackToTop";
import ScrollToTop from "@/app/components/ScrollToTop";
import { Providers } from "./providers";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const HOME_TITLE = "AEOCheck - Free AEO Scanner & AI Search Readiness Audit";
const HOME_DESCRIPTION =
  "Scan any URL for AI search readiness. AEOCheck checks metadata, schema, headings, content clarity, and answer readiness for ChatGPT, Perplexity, and Google AI results.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  other: {
    keywords:
      "AEO scanner, AI search readiness scanner, AI visibility scanner, AI SEO audit, answer engine optimization tool, ChatGPT visibility checker, Perplexity visibility checker, Google AI results optimization, AI search visibility checker, schema audit for AI search, GEO scanner, generative engine optimization checker, Webflow AEO",
    "msvalidate.01": "9B4C2F424809ACD0BE84EEB08CB2B2BD",
  },
  alternates: {
    canonical: absoluteUrl("/"),
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
      },
    ],
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE],
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
    <html lang="en" style={{ scrollBehavior: "auto" }}>
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
          strategy="lazyOnload"
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
        <Providers>
          <ScrollToTop />
          {children}
          <BackToTop />
        </Providers>
      </body>
    </html>
  );
}
