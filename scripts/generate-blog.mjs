const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const keyword = process.env.KEYWORD;
if (!keyword) { console.error('KEYWORD env var required'); process.exit(1); }

const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const today = new Date().toISOString().split('T')[0];
const client = new Anthropic();

// ─── Image generation via Hugging Face FLUX.1-schnell (free tier) ───────────
async function generateImage(keyword, slug) {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    console.log('HF_TOKEN not set - skipping image. Add it to .env.local to enable.');
    return null;
  }

  // Ask Claude for a tight image prompt based on the keyword
  const promptRes = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Write a single image generation prompt (under 50 words) for a blog cover image about: "${keyword}".
Style: clean minimal tech illustration, teal and white palette, abstract, professional.
No text, no letters, no words anywhere in the image.
Output only the prompt text, nothing else.`
    }]
  });

  const imagePrompt = promptRes.content[0].text.trim();
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
    const err = await res.text();
    console.log(`Image generation failed (${res.status}) - skipping:`, err.slice(0, 120));
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

// ─── Blog generation ─────────────────────────────────────────────────────────
async function generatePost() {
  console.log('Generating post for:', keyword);

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Write a 1400-word SEO + AEO-optimized blog post for AEOCheck.co targeting: "${keyword}"

AEOCheck tracks brand visibility across AI search engines - ChatGPT, Perplexity, Google AI Overviews.

HARD RULES (output rejected if violated):
- Hyphens ONLY. Never use em dashes (—) or en dashes (–). 
  Bad: "traffic — which dropped"   Good: "traffic - which dropped"
- No filler openers: "In today's landscape", "It's no secret", "Now more than ever"
- No markdown code fences wrapping the output

Content requirements:
- H2 and H3 subheadings throughout
- Practical, data-driven advice
- FAQ section at end (5 questions)
- Reference /features and /pricing as natural inline links
- CTA at end: try AEOCheck free
- Second person, authoritative tone

Output ONLY valid MDX with this exact frontmatter, nothing before or after:

---
title: "..."
description: "..."
date: "${today}"
author: "Ammar Ahmed"
tags: ["...", "...", "..."]
coverImage: ""
---

[article content]`
    }]
  });

  return res.content[0].text;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
  // Run post + image in parallel (image generation takes ~15-30s on cold start)
  const [rawContent, imgPath] = await Promise.all([
    generatePost(),
    generateImage(keyword, slug).catch(e => {
      console.log('Image error (non-fatal):', e.message);
      return null;
    })
  ]);

  // Hard strip: replace any em/en dashes that slipped through generation
  let content = rawContent
    .replace(/\u2014/g, ' - ')  // em dash —
    .replace(/\u2013/g, ' - ')  // en dash –
    .replace(/\uFE58/g, ' - ') // small em dash
    .replace(/\uFE63/g, ' - '); // small hyphen

  // Inject cover image path into frontmatter
  if (imgPath) {
    content = content.replace('coverImage: ""', `coverImage: "${imgPath}"`);
  }

  fs.mkdirSync('content/blog', { recursive: true });
  const outPath = path.join('content/blog', `${slug}.mdx`);
  fs.writeFileSync(outPath, content);

  console.log('\nDone:');
  console.log('  Post:', outPath);
  if (imgPath) console.log('  Image:', imgPath);
  else console.log('  Image: skipped (add HF_TOKEN to enable)');
}

run().catch(e => { console.error(e); process.exit(1); });