import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const apiKey = process.env.ANTHROPIC_API_KEY;
const hfToken = process.env.HF_TOKEN;

if (!apiKey) { console.error('ANTHROPIC_API_KEY env var required'); process.exit(1); }
if (!hfToken) { console.error('HF_TOKEN env var required'); process.exit(1); }

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

// ─── Generate one cover image via Hugging Face FLUX.1-schnell ────────────────
async function generateImage(title, slug) {
  const imagePrompt = (await callClaude(
    `Write a single image generation prompt (under 50 words) for a blog cover about: "${title}".
Style: clean minimal tech illustration, teal and white palette, abstract, professional.
No text, no letters anywhere. Output only the prompt, nothing else.`
  )).trim();

  console.log(`  Prompt: ${imagePrompt}`);

  const doRequest = () => fetch(
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

  let res = await doRequest();

  if (res.status === 503) {
    console.log('  Model loading (503) - waiting 20s and retrying...');
    await new Promise(r => setTimeout(r, 20000));
    res = await doRequest();
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HF API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  fs.mkdirSync(COVERS_DIR, { recursive: true });
  const imgPath = path.join(COVERS_DIR, `${slug}.jpg`);
  fs.writeFileSync(imgPath, buffer);
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

  const hasCover = parsed.data.coverImage && parsed.data.coverImage.trim() !== '';

  if (hasCover) {
    console.log(`SKIP  ${file} - already has coverImage`);
    skipped++;
    continue;
  }

  const title = parsed.data.title || slug;
  console.log(`GEN   ${file} - "${title}"`);

  try {
    const imgPath = await generateImage(title, slug);
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
