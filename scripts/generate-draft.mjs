// scripts/generate-draft.mjs
// Picks the highest-priority "planned" (or "refresh") slot from content/topical-map.json,
// generates an MDX draft via the Anthropic API with required internal links and FAQ block,
// writes it to BLOG_DIR, and marks the slot "drafted".
//
// Env required: ANTHROPIC_API_KEY
// Optional: ANTHROPIC_MODEL (default claude-sonnet-4-6), BLOG_DIR (default content/blog),
//           TARGET_SLUG (force a specific slot)

import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) throw new Error("ANTHROPIC_API_KEY env var is required");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const BLOG_DIR = process.env.BLOG_DIR || "content/blog";
const MAP_PATH = path.resolve("content/topical-map.json");

const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));

function pickSlot() {
  if (process.env.TARGET_SLUG) {
    const slot = map.slots.find((s) => s.slug === process.env.TARGET_SLUG);
    if (!slot) throw new Error(`Slot not found: ${process.env.TARGET_SLUG}`);
    return slot;
  }
  const candidates = map.slots
    .filter((s) => s.status === "planned" || s.status === "refresh")
    .sort((a, b) => {
      // hubs before spokes within the same tier, refresh before planned within same tier+role
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.role !== b.role) return a.role === "hub" ? -1 : 1;
      if (a.status !== b.status) return a.status === "refresh" ? -1 : 1;
      return 0;
    });
  if (candidates.length === 0) {
    console.log("No planned or refresh slots remaining. Nothing to do.");
    process.exit(0);
  }
  return candidates[0];
}

function buildInternalLinkBrief(slot) {
  const pillar = map.pillars.find((p) => p.id === slot.pillar);
  const hub = map.slots.find((s) => s.slug === pillar.hubSlug);
  const siblings = map.slots
    .filter((s) => s.pillar === slot.pillar && s.slug !== slot.slug && s.role === "spoke")
    .slice(0, 3);
  const base = map.site + map.blogBasePath;
  const links = [];
  if (slot.role === "spoke" && hub) {
    links.push({ url: base + hub.slug, anchorIdea: hub.title, required: true, kind: "hub" });
  }
  for (const sib of siblings) {
    links.push({ url: base + sib.slug, anchorIdea: sib.title, required: false, kind: "sibling" });
  }
  links.push({
    url: map.site + "/#scanner",
    anchorIdea: "run a free AEO scan",
    required: true,
    kind: "cta",
  });
  return links;
}

async function generate(slot) {
  const links = buildInternalLinkBrief(slot);
  const wordTarget = slot.role === "hub" ? "2800-3500" : "1400-1900";
  const isRefresh = slot.status === "refresh";

  const prompt = `You are the content lead for AEOCheck (https://www.aeocheck.co), a free AEO scanner that checks websites for AI search readiness (ChatGPT, Perplexity, Google AI Overviews). Audience: agencies, SEO freelancers, Webflow/WordPress developers, SaaS founders. Voice: practical, direct, zero fluff, expert but plain-English. Never use long em dashes; use regular hyphens.

Write a complete MDX blog post.

TITLE: ${slot.title}
SLUG: ${slot.slug}
ROLE: ${slot.role} (${slot.role === "hub" ? "comprehensive pillar page" : "focused cluster post"})
TARGET QUERIES (cover all naturally, lead with the primary): ${(slot.targetQueries || []).join(", ")}
LENGTH: ${wordTarget} words
${isRefresh ? `THIS IS A CONTENT REFRESH. Reason: ${slot.refreshReason || "performance decay"}. Make it current for 2026 and substantially improved.` : ""}
${slot.notes ? `NOTES: ${slot.notes}` : ""}

REQUIRED STRUCTURE:
1. Open with a direct 2-3 sentence answer to the primary query (answer-first, quotable by AI engines).
2. Clear H2/H3 hierarchy. Each H2 should map to a question a user actually asks.
3. Include one practical, concrete example or mini code/config snippet where relevant.
4. End the body with an "FAQ" H2 containing 4-5 question H3s with 2-4 sentence answers.
5. Weave in these internal links with natural anchor text (do NOT dump them in a list):
${links.map((l) => `   - ${l.required ? "[REQUIRED]" : "[optional]"} ${l.url} (about: ${l.anchorIdea})`).join("\n")}
6. One natural mention of running a free scan on AEOCheck - helpful, not salesy.
7. Do NOT fabricate statistics, named studies, or specific dates of third-party events. If illustrative numbers are needed, present them clearly as examples ("say your site gets...").

OUTPUT FORMAT - exactly this, nothing else:
---
title: "${slot.title.replace(/"/g, '\\"')}"
description: "<150-160 char meta description, includes primary query phrasing>"
slug: "${slot.slug}"
date: "${new Date().toISOString().slice(0, 10)}"
category: "${slot.pillar}"
faqs:
  - question: "<question 1>"
    answer: "<answer 1>"
  - question: "<question 2>"
    answer: "<answer 2>"
  - question: "<question 3>"
    answer: "<answer 3>"
  - question: "<question 4>"
    answer: "<answer 4>"
---

<post body in MDX>

The faqs frontmatter must mirror the FAQ section in the body (used to auto-generate FAQPage JSON-LD). Begin your response with the --- frontmatter line.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }
  const data = await res.json();
  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text.startsWith("---")) {
    throw new Error("Generated content missing frontmatter; aborting to avoid bad commit.");
  }
  return text;
}

async function main() {
  const slot = pickSlot();
  console.log(`Generating draft: ${slot.slug} (tier ${slot.tier}, ${slot.role}, status ${slot.status})`);

  const mdx = await generate(slot);

  fs.mkdirSync(BLOG_DIR, { recursive: true });
  const outPath = path.join(BLOG_DIR, `${slot.slug}.mdx`);
  fs.writeFileSync(outPath, mdx);

  slot.status = "drafted";
  slot.draftedAt = new Date().toISOString().slice(0, 10);
  delete slot.refreshReason;
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");

  console.log(`Draft written: ${outPath}`);
  // Expose slug to the workflow for PR title
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slot.slug}\ntitle=${slot.title}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
