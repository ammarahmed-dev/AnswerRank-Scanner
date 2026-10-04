// Measures AI-readiness signals on a fixed list of well-known sites and writes data/ai-readiness-study.json.
// Run: node --experimental-strip-types scripts/ai-readiness-study.mjs
// Only reads public files (robots.txt, llms.txt, the homepage). The site list is hand-picked, not a random sample.
import { writeFileSync } from "node:fs";
import { AI_CRAWLERS, AI_SEARCH_CRAWLERS, parseRobotsGroups, isRootAllowed } from "../lib/robots.ts";

const SITES = {
  SaaS: "stripe.com notion.so slack.com hubspot.com shopify.com atlassian.com asana.com monday.com zoom.us dropbox.com airtable.com figma.com canva.com mailchimp.com zendesk.com salesforce.com intercom.com webflow.com wix.com squarespace.com semrush.com ahrefs.com moz.com clickup.com trello.com gitlab.com vercel.com netlify.com cloudflare.com twilio.com datadoghq.com supabase.com linear.app loom.com calendly.com typeform.com zapier.com freshworks.com pipedrive.com brevo.com klaviyo.com gusto.com docusign.com miro.com framer.com posthog.com sentry.io mixpanel.com amplitude.com".split(" "),
  Media: "nytimes.com theguardian.com bbc.com cnn.com forbes.com techcrunch.com wired.com theverge.com reuters.com washingtonpost.com bloomberg.com medium.com substack.com wikipedia.org reddit.com quora.com stackoverflow.com nerdwallet.com healthline.com webmd.com investopedia.com".split(" "),
  Ecommerce: "amazon.com etsy.com walmart.com target.com bestbuy.com ebay.com wayfair.com ikea.com nike.com allbirds.com".split(" "),
  "AI companies": "openai.com anthropic.com perplexity.ai mistral.ai huggingface.co".split(" "),
};
const UA = "Mozilla/5.0 (compatible; AEOCheckStudy/1.0; +https://www.aeocheck.co)";

async function get(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const text = res.ok ? (await res.text()).slice(0, 600000) : "";
    return { ok: res.ok, status: res.status, type: res.headers.get("content-type") ?? "", text };
  } catch {
    return { ok: false, status: 0, type: "", text: "" };
  }
}

function jsonLdTypes(html) {
  const types = new Set();
  const re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const walk = (n) => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === "object") {
          const t = n["@type"];
          (Array.isArray(t) ? t : t ? [t] : []).forEach((x) => types.add(String(x)));
          Object.values(n).forEach(walk);
        }
      };
      walk(JSON.parse(m[1]));
    } catch { /* ignore invalid JSON-LD */ }
  }
  return [...types];
}

async function scan(domain, category) {
  const [robots, llms, home] = await Promise.all([
    get(`https://${domain}/robots.txt`),
    get(`https://${domain}/llms.txt`),
    get(`https://${domain}/`),
  ]);
  const robotsOk = robots.ok && !/html/i.test(robots.type) && /user-agent/i.test(robots.text);
  const groups = robotsOk ? parseRobotsGroups(robots.text) : [];
  const blocked = robotsOk ? Object.keys(AI_CRAWLERS).filter((a) => !isRootAllowed(groups, a)) : [];
  const llmsOk = llms.ok && !/html/i.test(llms.type) && /^\s*#/.test(llms.text);
  const types = home.ok ? jsonLdTypes(home.text) : [];
  return {
    domain, category,
    robotsReachable: robotsOk,
    blocked,
    blocksSearchCrawler: blocked.some((a) => AI_SEARCH_CRAWLERS.includes(a)),
    blocksGptbot: blocked.includes("gptbot"),
    blocksAnyAi: blocked.length > 0,
    llmsTxt: llmsOk,
    homeReachable: home.ok,
    jsonLd: types.length > 0,
    organizationSchema: types.some((t) => /^(Organization|Corporation|LocalBusiness|NewsMediaOrganization|OnlineStore)$/i.test(t)),
    faqSchema: types.includes("FAQPage"),
  };
}

const all = Object.entries(SITES).flatMap(([c, ds]) => ds.map((d) => [d, c]));
const results = [];
for (let i = 0; i < all.length; i += 8) {
  results.push(...(await Promise.all(all.slice(i, i + 8).map(([d, c]) => scan(d, c)))));
}
writeFileSync("data/ai-readiness-study.json", JSON.stringify({ collectedAt: new Date().toISOString().slice(0, 10), results }, null, 1));
console.log(`scanned ${results.length}; robots ok ${results.filter((r) => r.robotsReachable).length}`);
