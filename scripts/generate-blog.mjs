import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const keyword = process.env.KEYWORD;
if (!keyword) { console.error('KEYWORD env var required'); process.exit(1); }

const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const today = new Date().toISOString().split('T')[0];
const client = new Anthropic();

async function generateImage(keyword, slug) {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    console.log('HF_TOKEN not set - skipping image.');
    return null;
  }
  const promptRes = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: `Write a single image generation prompt (under 50 words) for a blog cover about: "${keyword}". Style: clean minimal tech illustration, teal and white palette, abstract, professional. No text, no letters. Output only the prompt.` }]
  });
  const imagePrompt = promptRes.content[0].text.trim();
  console.log('Image prompt:', imagePrompt);
  const res = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: imagePrompt }),
  });
  if (!res.ok) { console.log(`Image skipped (${res.status})`); return null; }
  const buffer = await res.arrayBuffer();
  const outDir = 'public/blog/covers';
  fs.mkdirSync(outDir, { recursive: true });
  const imgPath = path.join(outDir, `${slug}.jpg`);
  fs.writeFileSync(imgPath, Buffer.from(buffer));
  console.log('Image saved:', imgPath);
  return `/blog/covers/${slug}.jpg`;
}

async function generatePost() {
  console.log('Generating post for:', keyword);
  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: `Write a 1400-word SEO + AEO-optimized blog post for AEOCheck.co targeting: "${keyword}"

AEOCheck tracks brand visibility across AI search engines - ChatGPT, Perplexity, Google AI Overviews.

HARD RULES:
- Hyphens ONLY. Never em dashes (—) or en dashes (–).
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

[article content]` }]
  });
  return res.content[0].text;
}

const [rawContent, imgPath] = await Promise.all([
  generatePost(),
  generateImage(keyword, slug).catch(e => { console.log('Image error:', e.message); return null; })
]);

let content = rawContent
  .replace(/\u2014/g, ' - ')
  .replace(/\u2013/g, ' - ')
  .replace(/\uFE58/g, ' - ')
  .replace(/\uFE63/g, ' - ');

if (imgPath) content = content.replace('coverImage: ""', `coverImage: "${imgPath}"`);

fs.mkdirSync('content/blog', { recursive: true });
const outPath = path.join('content/blog', `${slug}.mdx`);
fs.writeFileSync(outPath, content);

console.log('\nDone:');
console.log('  Post  :', outPath);
console.log('  Image :', imgPath ?? 'skipped (add HF_TOKEN to enable)');