import fs from 'fs';
import path from 'path';

const keyword = process.env.KEYWORD;
if (!keyword) { console.error('KEYWORD env var required'); process.exit(1); }

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY env var required'); process.exit(1); }

const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const today = new Date().toISOString().split('T')[0];

// ─── Helper: call Anthropic API directly via fetch (no SDK needed) ──────────
async function callClaude(prompt, maxTokens = 4096) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

// ─── Image via Hugging Face FLUX.1-schnell (free) ────────────────────────────
async function generateImage(keyword, slug) {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    console.log('HF_TOKEN not set - skipping image. Add to .env.local to enable.');
    return null;
  }

  const imagePrompt = (await callClaude(
    `Write a single image generation prompt (under 50 words) for a blog cover about: "${keyword}".
Style: clean minimal tech illustration, teal and white palette, abstract, professional.
No text, no letters anywhere. Output only the prompt, nothing else.`,
    100
  )).trim();

  console.log('Image prompt:', imagePrompt);

  const res = await fetch(
    'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: imagePrompt }),
    }
  );

  if (!res.ok) {
    console.log(`Image skipped (${res.status}):`, (await res.text()).slice(0, 100));
    return null;
  }

  const buffer = await res.arrayBuffer();
  const outDir = 'public/blog/covers';
  fs.mkdirSync(outDir, { recursive: true });
  const imgPath = path.join(outDir, `${slug}.jpg`);
  fs.writeFileSync(imgPath, Buffer.from(buffer));
  console.log('Cover image saved:', imgPath);
  return `/blog/covers/${slug}.jpg`;
}

// ─── Blog post ────────────────────────────────────────────────────────────────
async function generatePost() {
  console.log('Generating post for:', keyword);

  return await callClaude(`Write a 1400-word SEO + AEO-optimized blog post for AEOCheck.co targeting: "${keyword}"

AEOCheck tracks brand visibility across AI search engines - ChatGPT, Perplexity, Google AI Overviews.

HARD RULES:
- Hyphens ONLY. Never em dashes (—) or en dashes (–).
  Bad: "traffic — which dropped"   Good: "traffic - which dropped"
- No filler openers like "In today's landscape" or "It's no secret"
- No markdown code fences wrapping the output

Content:
- H2 and H3 subheadings throughout
- Practical, data-driven advice
- FAQ section at end (5 questions)
- Reference /features and /pricing as natural inline links
- CTA at end: try AEOCheck free
- Second person, authoritative tone

Output ONLY valid MDX with this exact frontmatter:

---
title: "..."
description: "..."
date: "${today}"
author: "Ammar Ahmed"
tags: ["...", "...", "..."]
coverImage: ""
---

[article content]`, 4096);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const [rawContent, imgPath] = await Promise.all([
  generatePost(),
  generateImage(keyword, slug).catch(e => {
    console.log('Image error (non-fatal):', e.message);
    return null;
  })
]);

// Hard strip - catches any dashes that slipped through
let content = rawContent
  .replace(/\u2014/g, ' - ')  // em dash —
  .replace(/\u2013/g, ' - ')  // en dash –
  .replace(/\uFE58/g, ' - ')  // small em dash
  .replace(/\uFE63/g, ' - '); // small hyphen-bullet

if (imgPath) {
  content = content.replace('coverImage: ""', `coverImage: "${imgPath}"`);
}

fs.mkdirSync('content/blog', { recursive: true });
const outPath = path.join('content/blog', `${slug}.mdx`);
fs.writeFileSync(outPath, content);

console.log('\nDone:');
console.log('  Post  :', outPath);
console.log('  Image :', imgPath ?? 'skipped (set HF_TOKEN to enable)');
