// scripts/link-lint.mjs
// CI linter that enforces the hub-and-spoke internal linking rules from topical-map.json:
//   - every spoke post must link to its pillar hub
//   - every post must contain a scanner CTA link (/#scanner or /sample-report)
//   - hubs should link to at least 2 of their spokes (warning until cluster matures)
//
// Env optional: BLOG_DIR (default content/blog), STRICT=1 to fail on warnings too.
// Exit code 1 on required-link failures (use as a PR check).

import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = process.env.BLOG_DIR || "content/blog";
const MAP_PATH = path.resolve("content/topical-map.json");
const STRICT = process.env.STRICT === "1";

const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
const base = map.blogBasePath; // "/blog/"

let errors = 0;
let warnings = 0;

function contains(content, slug) {
  // matches absolute or relative blog links to the slug
  return content.includes(`${base}${slug}`);
}

if (!fs.existsSync(BLOG_DIR)) {
  console.log(`Blog dir ${BLOG_DIR} not found - nothing to lint.`);
  process.exit(0);
}

const files = fs.readdirSync(BLOG_DIR).filter((f) => /\.(mdx?|md)$/.test(f));

for (const file of files) {
  const slug = file.replace(/\.(mdx?|md)$/, "");
  const slot = map.slots.find((s) => s.slug === slug);
  if (!slot) {
    console.log(`NOTE  ${slug}: not in topical-map.json (legacy post?) - skipping rules, consider mapping it.`);
    continue;
  }
  const content = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
  const pillar = map.pillars.find((p) => p.id === slot.pillar);

  // Rule 1: spoke -> hub link
  if (slot.role === "spoke" && pillar && !contains(content, pillar.hubSlug)) {
    console.log(`ERROR ${slug}: missing link to pillar hub ${base}${pillar.hubSlug}`);
    errors++;
  }

  // Rule 2: scanner CTA
  if (!content.includes("/#scanner") && !content.includes("/sample-report")) {
    console.log(`ERROR ${slug}: missing scanner CTA link (/#scanner or /sample-report)`);
    errors++;
  }

  // Rule 3: hub -> spokes (>=2 once spokes exist)
  if (slot.role === "hub") {
    const spokes = map.slots.filter(
      (s) => s.pillar === slot.pillar && s.role === "spoke" && (s.status === "published" || s.status === "drafted")
    );
    const linked = spokes.filter((s) => contains(content, s.slug)).length;
    if (spokes.length >= 2 && linked < 2) {
      console.log(`WARN  ${slug}: hub links to only ${linked}/${spokes.length} live spokes (want >=2)`);
      warnings++;
    }
  }
}

console.log(`\nlink-lint: ${files.length} files checked, ${errors} error(s), ${warnings} warning(s)`);
if (errors > 0 || (STRICT && warnings > 0)) process.exit(1);
