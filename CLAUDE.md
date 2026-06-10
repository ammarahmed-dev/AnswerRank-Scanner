# AEOCheck - Claude Code Instructions

## Project
AEOCheck (aeocheck.co) is a Next.js 14 / TypeScript / Supabase / Vercel SaaS that scans websites
for AI/Answer Engine Optimization (AEO) readiness. It tracks brand visibility across ChatGPT,
Perplexity, Google AI Overviews, and similar AI search engines. Pricing: Free / $19 Pro / $49 Agency.
Payments via Lemon Squeezy. Auth via Google OAuth + email (NextAuth). Built by Ammar Ahmed (solo).

## Stack
- Framework: Next.js 14 (App Router), TypeScript strict mode
- Database: Supabase (Postgres + RLS)
- Payments: Lemon Squeezy (webhooks at /api/webhooks/lemonsqueezy)
- Auth: NextAuth v5 with Google provider
- AI: Anthropic API (claude-sonnet-4-20250514)
- Deploy: Vercel (auto-deploy from main branch)
- Blog: MDX files in content/blog/, served via next-mdx-remote

## Key Paths
- Blog posts: content/blog/*.mdx
- GitHub workflows: .github/workflows/
- GitHub scripts: .github/scripts/
- API routes: src/app/api/
- Components: src/components/
- Lib/utils: src/lib/

## Environment (never hardcode, always read from .env.local)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY,
LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET

---

## TASK: Blog Post Generation

**Triggers:** "write a blog post about X", "generate blog for X", "create post on X"

**Steps:**
1. Confirm .github/scripts/generate-blog.js exists. If not, create it (see template at bottom).
2. Run the script locally:
   ```bash
   source .env.local 2>/dev/null || export $(cat .env.local | grep -v ^# | xargs)
   KEYWORD="[keyword]" node .github/scripts/generate-blog.js
   ```
3. Open the generated content/blog/[slug].mdx and review for:
   - Frontmatter complete (title, description, date, author, tags)
   - Internal links to /features and /pricing present
   - FAQ section at end
   - No em dashes (replace any with hyphens)
4. Fix any issues directly in the MDX file.
5. Run `git add content/blog/ && git diff --staged` so the user can review.

**Blog system prompt to use when calling Anthropic API in the script:**
Write a 1400-word SEO + AEO-optimized blog post for AEOCheck.co targeting: "[keyword]"
AEOCheck tracks brand visibility across AI search engines (ChatGPT, Perplexity, Google AI Overviews).
Requirements: H2/H3 structure, FAQ section (5 questions), /features and /pricing inline links,
CTA to try AEOCheck free, second person, authoritative tone, NO em dashes, no markdown fences.
Output ONLY valid MDX with frontmatter: title, description (155 chars), date, author: "Ammar Ahmed", tags.

---

## TASK: SEO Optimization

**Triggers:** "run SEO check", "fix SEO", "check meta", "audit site", "SEO issues"

**Steps - run all or individual as needed:**

1. **TypeScript + build health** (always run first):
   ```bash
   npx tsc --noEmit && echo "TS OK"
   npm run build 2>&1 | tail -30
   ```

2. **URL health check** (check all public pages return 200):
   ```bash
   node -e "
   const pages=['https://aeocheck.co','https://aeocheck.co/blog',
   'https://aeocheck.co/pricing','https://aeocheck.co/features',
   'https://aeocheck.co/login','https://aeocheck.co/signup'];
   (async()=>{for(const u of pages){const r=await fetch(u);
   console.log((r.status===200?'OK':'FAIL')+' '+r.status+' '+u);}})();"
   ```

3. **Broken internal links** - grep all MDX/TSX files for href values and check they resolve:
   ```bash
   grep -r 'href="/' src/ content/ --include="*.tsx" --include="*.mdx" | grep -v node_modules
   ```

4. **Missing meta descriptions** - find MDX files without a description field:
   ```bash
   grep -rL "description:" content/blog/
   ```

5. **Duplicate H1s** - flag any page with more than one H1:
   ```bash
   grep -rn "^# " content/blog/ | awk -F: '{print $1}' | sort | uniq -d
   ```

6. **Schema check** - verify JSON-LD is present on key pages:
   ```bash
   grep -rl "application/ld+json" src/ --include="*.tsx"
   ```

7. **For meta optimization requests**: Read the MDX file, check current title/description against
   the target keyword, suggest 3 alternatives using the format: "Title (X chars) | Description (Y chars)".
   Apply the chosen option directly.

---

## TASK: Dev QA & Upgrades

**Triggers:** "run QA", "fix errors", "check build", "update deps", "QA check", "fix TypeScript"

**Standard QA sequence (run in order, fix before moving to next):**

```bash
# 1. TypeScript - must pass with zero errors
npx tsc --noEmit

# 2. Lint - fix auto-fixable issues
npx eslint . --fix --ext .ts,.tsx 2>&1 | head -50

# 3. Build - must succeed cleanly
npm run build

# 4. Check bundle size hasn't regressed
ls -lh .next/static/chunks/*.js 2>/dev/null | sort -k5 -rh | head -10
```

**When fixing TypeScript errors:**
- Fix root causes, never use `// @ts-ignore` or `as any` unless truly unavoidable
- Check if the error is a missing type definition first: `npm install --save-dev @types/[package]`
- For Supabase type errors, regenerate types: `npx supabase gen types typescript --local > src/types/supabase.ts`

**Dependency updates (safe approach):**
```bash
# Check what's outdated
npm outdated

# Update patch/minor only (safe)
npx npm-check-updates -u --target minor
npm install

# Test build still passes
npm run build
```

**For new feature requests:**
1. Check if a similar pattern exists in src/components/ or src/app/ first
2. Follow existing file/folder naming conventions (kebab-case files, PascalCase components)
3. Add TypeScript types - no implicit `any`
4. If touching Supabase: check RLS policies won't block the query

---

## TASK: GitHub Actions Setup

**Triggers:** "set up GitHub Actions", "initialize automation", "create workflows", "set up CI"

Create these 4 files if they don't exist:

1. `.github/workflows/blog-generate.yml` - manual trigger workflow for blog generation
2. `.github/workflows/ci.yml` - TypeScript + build check on every push to main
3. `.github/workflows/seo-weekly.yml` - weekly URL health + Lighthouse audit (Mondays 8am UTC)
4. `.github/scripts/generate-blog.js` - Node.js script called by blog workflow

After creating files, remind the user to add these GitHub Secrets:
→ Settings → Secrets and variables → Actions → New secret
Required: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, LEMONSQUEEZY_WEBHOOK_SECRET

---

## Code Standards (apply to ALL output - code, content, comments)

- NO em dashes (—) anywhere. Use a regular hyphen (-) instead.
- TypeScript strict mode - no implicit any, no unused variables
- Component files: PascalCase (UserDashboard.tsx)
- Utility/lib files: kebab-case (auth-helpers.ts)
- API routes follow Next.js App Router convention: src/app/api/[route]/route.ts
- Supabase queries always include error handling: `const { data, error } = await supabase...`
- Never log sensitive data (API keys, user emails, auth tokens) to console
- Blog content: second person, authoritative, no em dashes, no fluff openers like "In today's world"
- Commit messages: conventional commits format (feat:, fix:, blog:, chore:, docs:)

---

## generate-blog.js Template

If .github/scripts/generate-blog.js doesn't exist, create it with this exact content:

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const keyword = process.env.KEYWORD;
if (!keyword) { console.error('KEYWORD env var required'); process.exit(1); }

const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const today = new Date().toISOString().split('T')[0];
const client = new Anthropic();

async function run() {
  console.log('Generating post for:', keyword);
  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Write a 1400-word SEO + AEO-optimized blog post for AEOCheck.co targeting: "${keyword}"

AEOCheck tracks brand visibility across AI search engines - ChatGPT, Perplexity, Google AI Overviews.

Requirements:
- H2 and H3 subheadings throughout
- Practical, actionable advice
- FAQ section at end (5 questions)
- Reference /features and /pricing as inline links
- CTA: try AEOCheck free
- Second person, authoritative tone
- No em dashes - use hyphens only

Output ONLY valid MDX with this frontmatter:

---
title: "..."
description: "..."
date: "${today}"
author: "Ammar Ahmed"
tags: ["...", "...", "..."]
---

[article here]`
    }]
  });
  const content = res.content[0].text;
  fs.mkdirSync('content/blog', { recursive: true });
  fs.writeFileSync(path.join('content/blog', slug + '.mdx'), content);
  console.log('Done: content/blog/' + slug + '.mdx');
}

run().catch(e => { console.error(e); process.exit(1); });
```
