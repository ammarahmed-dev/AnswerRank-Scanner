// scripts/indexnow-ping.mjs
// Submits new/changed URLs to IndexNow (Bing, Yandex, Seznam, Naver - NOT Google;
// Google coverage is handled by gsc-submit-sitemap.mjs).
//
// Env required: SITE_URL (e.g. https://www.aeocheck.co), INDEXNOW_KEY
// The key file must be hosted at: {SITE_URL}/{INDEXNOW_KEY}.txt containing the key.
//
// Usage:
//   node scripts/indexnow-ping.mjs url1 url2 ...     (explicit URLs)
//   CHANGED_SLUGS="a b c" node scripts/indexnow-ping.mjs   (slugs -> /blog/<slug>)

const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");
const KEY = process.env.INDEXNOW_KEY;
if (!SITE_URL || !KEY) throw new Error("SITE_URL and INDEXNOW_KEY env vars are required");

const ENDPOINT = "https://api.indexnow.org/indexnow";

function collectUrls() {
  const urls = new Set();
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("http")) urls.add(arg);
  }
  const slugs = (process.env.CHANGED_SLUGS || "").split(/\s+/).filter(Boolean);
  for (const slug of slugs) {
    urls.add(`${SITE_URL}/blog/${slug}`);
  }
  return [...urls];
}

async function main() {
  const urlList = collectUrls();
  if (urlList.length === 0) {
    console.log("No URLs to submit. Skipping.");
    return;
  }
  const host = new URL(SITE_URL).host;
  const payload = {
    host,
    key: KEY,
    keyLocation: `${SITE_URL}/${KEY}.txt`,
    urlList,
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // Per protocol: 200/202 = accepted; 403 = key file missing/mismatch;
  // 422 = URLs don't belong to host; 429 = rate limited.
  if (res.status === 200 || res.status === 202) {
    console.log(`IndexNow accepted ${urlList.length} URL(s):`);
    urlList.forEach((u) => console.log("  " + u));
  } else {
    const body = await res.text();
    throw new Error(`IndexNow submission failed (${res.status}): ${body}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
