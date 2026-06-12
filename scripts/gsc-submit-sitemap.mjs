// scripts/gsc-submit-sitemap.mjs
// Resubmits the sitemap to Google via the Search Console API.
// (Google's old unauthenticated sitemap "ping" endpoint was deprecated and now 404s,
// so this authenticated API call is the correct way to nudge Google after publishing.)
//
// Env required:
//   GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY
//   GSC_SITE_URL   e.g. "sc-domain:aeocheck.co" or "https://www.aeocheck.co/"
//   SITE_URL       e.g. "https://www.aeocheck.co" (used to build the sitemap URL)
// Optional: SITEMAP_PATH (default /sitemap.xml)

import { getAccessToken } from "./lib/gsc-auth.mjs";

const GSC_SITE_URL = process.env.GSC_SITE_URL;
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");
if (!GSC_SITE_URL || !SITE_URL) {
  throw new Error("GSC_SITE_URL and SITE_URL env vars are required");
}
const sitemapUrl = SITE_URL + (process.env.SITEMAP_PATH || "/sitemap.xml");

async function main() {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    GSC_SITE_URL
  )}/sitemaps/${encodeURIComponent(sitemapUrl)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok || res.status === 204) {
    console.log(`Sitemap submitted to GSC: ${sitemapUrl}`);
  } else {
    const body = await res.text();
    throw new Error(`GSC sitemap submit failed (${res.status}): ${body}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
