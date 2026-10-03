import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { InferenceClient } from '@huggingface/inference';

const apiKey = process.env.ANTHROPIC_API_KEY;
const hfToken = process.env.HF_TOKEN;

// Branded cover fallback (works without any API keys): /api/og/post on the live site.
const SITE_URL = (process.env.SITE_URL || 'https://www.aeocheck.co').replace(/\/$/, '');
// Hugging Face providers to try in order. "auto" routes to any provider serving the model
// (needs inference credits); "hf-inference" no longer serves FLUX.1-schnell.
const HF_PROVIDERS = (process.env.HF_IMAGE_PROVIDERS || 'auto,hf-inference').split(',').map(p => p.trim()).filter(Boolean);
if (!apiKey || !hfToken) console.log('ANTHROPIC_API_KEY or HF_TOKEN missing: using branded covers only.');

const BLOG_DIR = process.env.BLOG_DIR || 'content/blog';
const COVERS_DIR = 'public/images/blog';

// --slug <value> or positional arg to target a single post
const slugIdx = process.argv.indexOf('--slug');
const targetSlug = slugIdx !== -1 ? process.argv[slugIdx + 1] : (process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null);

// ─── Helper: call Anthropic API directly via fetch ───────────────────────────
async function callClaude(prompt, maxTokens = 100) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

// ─── Branded cover from the site's /api/og/post route ────────────────────────
async function brandedCover(title, slug, tag) {
  const url = `${SITE_URL}/api/og/post?title=${encodeURIComponent(title)}&tag=${encodeURIComponent(tag || 'AI Search')}`;
  const res = await fetch(url);
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('image/png')) throw new Error(`branded cover failed (${res.status} ${type})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5000) throw new Error('branded cover too small');
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  fs.writeFileSync(path.join(COVERS_DIR, `${slug}.png`), buffer);
  return `/images/blog/${slug}.png`;
}

// ─── Generate one cover image via Hugging Face FLUX.1-schnell ────────────────
async function generateImage(title, slug) {
  if (!apiKey || !hfToken) throw new Error('AI image generation not configured');
  const imagePrompt = (await callClaude(
    `Write a single image generation prompt (under 50 words) for a blog cover about: "${title}".
Style: clean minimal tech illustration, teal and white palette, abstract, professional.
No text, no letters anywhere. Output only the prompt, nothing else.`
  )).trim();

  console.log(`  Prompt: ${imagePrompt}`);

  const client = new InferenceClient(hfToken);

  let lastError;
  let saved = false;
  for (let attempt = 1; attempt <= HF_PROVIDERS.length; attempt++) {
    const provider = HF_PROVIDERS[attempt - 1];
    try {
      const imageBlob = await client.textToImage({
        model: 'black-forest-labs/FLUX.1-schnell',
        inputs: imagePrompt,
        provider,
      });
      const buffer = Buffer.from(await imageBlob.arrayBuffer());
      fs.mkdirSync(COVERS_DIR, { recursive: true });
      const imgPath = path.join(COVERS_DIR, `${slug}.jpg`);
      fs.writeFileSync(imgPath, buffer);
      saved = true;
      break;
    } catch (err) {
      lastError = err;
      console.log(`  Provider "${provider}" failed: ${err.message}`);
    }
  }
  if (lastError && !saved) throw lastError;

  return `/images/blog/${slug}.jpg`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
let files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'));

if (targetSlug) {
  files = files.filter(f => f === `${targetSlug}.mdx`);
  if (files.length === 0) {
    console.error(`No MDX file found for slug: ${targetSlug}`);
    process.exit(1);
  }
}

console.log(`Found ${files.length} blog post(s) to process.\n`);

let processed = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  const slug = file.replace(/\.mdx$/, '');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);

  const coverImagePath = parsed.data.coverImage?.trim() || null;
  const coverImageFile = coverImagePath ? path.join('public', coverImagePath) : null;
  const fileExists = coverImageFile ? fs.existsSync(coverImageFile) : false;

  if (coverImagePath && fileExists) {
    console.log(`SKIP  ${file} - coverImage set and file exists`);
    skipped++;
    continue;
  }

  if (coverImagePath && !fileExists) {
    console.log(`REGEN ${file} - coverImage set but file missing (${coverImagePath})`);
  }

  const title = parsed.data.title || slug;
  console.log(`GEN   ${file} - "${title}"`);

  try {
    let imgPath;
    try {
      imgPath = await generateImage(title, slug);
    } catch (err) {
      console.log(`  AI image unavailable (${err.message}) - using branded cover`);
      const tag = Array.isArray(parsed.data.tags) && parsed.data.tags[0] ? String(parsed.data.tags[0]).replace(/-/g, ' ') : 'AI Search';
      imgPath = await brandedCover(title, slug, tag);
    }
    parsed.data.coverImage = imgPath;

    const updated = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(filePath, updated);

    console.log(`  -> Saved: ${imgPath}\n`);
    processed++;
  } catch (e) {
    console.log(`  -> FAILED: ${e.message}\n`);
    failed++;
  }
}

console.log('---');
console.log(`Done. Generated: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
