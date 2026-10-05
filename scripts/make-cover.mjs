// Renders a branded 1200x630 blog cover (same look as the existing covers) to public/images/blog/<slug>.png.
// Claude makes covers by hand with this script; there is no automatic cover workflow.
// Usage: node scripts/make-cover.mjs <slug> "<title>" "<tag>"
// Needs playwright-core (install it in a scratch dir and set PLAYWRIGHT_CORE to its path) and a Chromium binary.
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const [slug, title, tag = "AI Search"] = process.argv.slice(2);
if (!slug || !title) {
  console.error('Usage: node scripts/make-cover.mjs <slug> "<title>" "<tag>"');
  process.exit(1);
}
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const exe = process.env.CHROMIUM_PATH || execSync("ls /opt/pw-browsers/chromium-*/chrome-linux/chrome").toString().trim().split("\n")[0];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const size = title.length > 70 ? 54 : title.length > 45 ? 62 : 72;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;font-family:Inter,"Liberation Sans",Arial,sans-serif;color:#fff;
background:linear-gradient(135deg,#0a0a0f 0%,#0b1a1a 60%,#06302a 100%);padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:16px}
.logo{width:52px;height:52px;border-radius:14px;background:#00e5a0;color:#04120d;font-size:30px;font-weight:800;display:flex;align-items:center;justify-content:center}
.brand{font-size:30px;font-weight:700}
.tag{margin-left:16px;padding:6px 16px;border-radius:999px;border:1px solid rgba(0,229,160,.45);color:#7ff5cf;font-size:22px;text-transform:uppercase;letter-spacing:.08em}
h1{font-size:${size}px;font-weight:800;line-height:1.12;letter-spacing:-.02em;max-width:1050px}
.bottom{display:flex;justify-content:space-between;align-items:center}
.bar{width:640px;height:6px;border-radius:999px;background:linear-gradient(90deg,#00e5a0,rgba(0,229,160,.15))}
.url{font-size:26px;color:#7ff5cf}
</style></head><body>
<div class="top"><div class="logo">A</div><div class="brand">AEOCheck</div><div class="tag">${esc(tag)}</div></div>
<h1>${esc(title)}</h1>
<div class="bottom"><div class="bar"></div><div class="url">www.aeocheck.co/blog</div></div>
</body></html>`;

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: `public/images/blog/${slug}.png`, type: "png" });
await browser.close();
console.log(`wrote public/images/blog/${slug}.png`);
