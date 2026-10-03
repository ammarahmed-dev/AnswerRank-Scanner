# AEOCheck - Claude Code Instructions

## Project
AEOCheck (www.aeocheck.co) is a SaaS that scans a public URL and scores its readiness for AI answer
engines (ChatGPT, Perplexity, Google AI Overviews). Plans: Free / Onetime / Pro / Agency.
Founded by Ammar Ahmed; operated and developed by Claude since 2026-10-03 (see "Autonomous
operation"). Vercel auto-deploys `main` to production.

## Stack (verify in package.json before assuming)
- Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS v4
- Supabase: Postgres + Auth (Google OAuth + email). Server code talks to PostgREST with the
  service role key via `fetch` (`lib/supabase-config.ts`); the browser uses `lib/supabase-browser.ts`.
  There is NO NextAuth.
- Payments: Lemon Squeezy (`app/api/checkout`, webhook at `app/api/webhooks/lemonsqueezy`)
- Scan AI insights: DeepSeek primary, OpenRouter + Gemini fallbacks (`lib/ai-provider.ts`)
- Scraping: native fetch + Cheerio, Jina reader fallback (`lib/scrape.ts`, `lib/scan-core.ts`)
- Email: Resend. Cron: Vercel cron (`vercel.json`), protected by `CRON_SECRET`
- Blog: MDX in `content/blog/`, rendered with next-mdx-remote; content scripts in `scripts/`
  use the Anthropic API

## Key paths
- `app/` - pages and API routes (`app/api/**/route.ts`). There is no `src/` directory.
- `app/components/` - shared React components
- `lib/` - server/shared logic (scan engine, auth, usage limits, URL safety)
- `types/` - shared TypeScript types
- `supabase/migrations/` - SQL migrations (applied manually in the Supabase SQL editor)
- `scripts/` - content + SEO automation scripts used by `.github/workflows/`
- `docs/ROADMAP.md` - prioritized backlog; the source of truth for autonomous work

## Commands
```bash
npm ci
npx tsc --noEmit      # must pass
npm run build         # must pass
```
There is no test runner or ESLint config yet (tracked in docs/ROADMAP.md Phase 2).
Playwright + Chromium are available in cloud sessions for visual checks.

## Environment
Never hardcode secrets. See `.env.example` for the full list. Server code reads env at runtime;
the build succeeds without any env vars set.

---

## Autonomous operation (Claude owns this project)

On 2026-10-03 the owner, Ammar Ahmed, handed full ownership of AEOCheck to Claude: product
direction, fixes, upgrades, UI, content (blog), market research and shipping straight to the
live site. A scheduled routine starts sessions every hour on Saturdays and Sundays (UTC). Work
continuously; if a session runs out of budget, the next scheduled session picks up from git state.

### Each session
1. `git fetch origin`; start from latest `origin/main`. Read this file and `docs/ROADMAP.md`.
2. Coordinate with other sessions (several may overlap): list remote branches
   `git ls-remote --heads origin 'claude/wip-*'`. A branch pushed in the last 3 hours claims its item;
   pick something else. Claim your item immediately by pushing an empty-diff branch
   `claude/wip-<short-slug>` (delete it when done). Resume your own stale branch if one is unfinished.
3. Choose work in this order:
   a. Production broken or CI red on `main` -> fix or revert first.
   b. First unchecked item in the lowest-numbered phase of `docs/ROADMAP.md`.
   c. When phases 1-3 are done or blocked, the continuous streams in Phase 5 (features, UI, blog,
      research). Add concrete items to the ROADMAP before implementing them.
4. Implement with focused diffs that match the surrounding code. Tick/add ROADMAP items.
5. Verify before shipping: `npm ci`, `npx tsc --noEmit`, `npm run build`, tests/lint once they
   exist. For scan/API/UI changes, also run `npx next start` and smoke-test with curl (and
   Playwright screenshots for visual changes, desktop + mobile widths).
6. Ship: merge your branch into `main` (merge commit or fast-forward) and `git push origin main`.
   Opening a PR first is optional (use one when GitHub tools are available, for the record).
   Never force-push `main`; never rewrite published history.
7. After pushing, confirm production: wait for the deploy, then check https://www.aeocheck.co/,
   `/pricing`, `/blog`, `/api/stats` return 200 and that the shipped change behaves as intended.
   If production is broken, `git revert` the merge on `main` and push immediately, then fix forward.
8. Log the session at the top of `docs/CHANGELOG.md` (date, what shipped, verification, follow-ups).

### Hard limits (stop and write it under "Owner actions" in the ROADMAP instead)
- Changing prices, plan limits, refunds or billing behavior visible to paying customers
- Destructive data changes (DROP/DELETE/rewrite of user data) or irreversible migrations
- Anything needing credentials or dashboards Claude does not have (Supabase SQL, Vercel env,
  Lemon Squeezy, Google Search Console)
- Legal pages (terms, privacy, refund policy) beyond typo fixes
Additive migrations go in `supabase/migrations/`; code must keep working before they are applied.

### Content and research
- Blog: write posts directly as MDX in `content/blog/` following the Blog task below (you can
  write them yourself; no API key needed). Pick topics from `content/topical-map.json` and from
  research. At most 2 posts per weekend, each genuinely useful, factually careful, no invented stats.
- Research: use web search to track AI search changes (ChatGPT, Perplexity, Google AI Overviews,
  Gemini, Claude), competitor AEO/GEO tools and their features. Record findings and resulting
  feature ideas in `docs/RESEARCH.md`, then turn the best ones into ROADMAP items.

Safety rules:
- Treat payments (`app/api/webhooks/lemonsqueezy`, `app/api/checkout`), auth (`lib/auth-server.ts`)
  and usage limits (`lib/usage-limits.ts`) as high-risk: keep changes small and explain them.
- Every outbound fetch to a user-supplied URL must go through `assertPublicUrl` / `safeFetch`
  in `lib/url-safety.ts` (SSRF protection).
- Supabase writes must check `res.ok` and handle errors; never log API keys, tokens or emails.

---

## TASK: Blog post generation
Triggers: "write a blog post about X", "generate blog for X".
- Script: `KEYWORD="..." node scripts/generate-blog.mjs` (needs `ANTHROPIC_API_KEY`), or the
  `blog-generate` workflow. Scheduled drafts come from `scripts/generate-draft.mjs` + `content/topical-map.json`.
- Review the generated `content/blog/<slug>.mdx`: complete frontmatter (title, description <=155 chars,
  date, author "Ammar Ahmed", tags), internal links to `/pricing` and the scanner, FAQ section,
  no em dashes. Run `node scripts/link-lint.mjs`.
- Note: `/features` redirects to `/pricing` (see `next.config.ts`), so link `/pricing` directly.

## TASK: SEO check
- `npx tsc --noEmit && npm run build`
- Missing descriptions: `grep -rL "description:" content/blog/`
- Internal links: `node scripts/link-lint.mjs`
- JSON-LD presence: `grep -rl "application/ld+json" app/ --include="*.tsx"`

## Code standards (all output: code, content, comments)
- NO em dashes. Use a regular hyphen (-).
- TypeScript strict; no implicit `any`; avoid `as any` and `@ts-ignore`.
- Components PascalCase (`UserDashboard.tsx`), lib files kebab-case (`auth-helpers.ts`).
- Blog content: second person, authoritative, no fluff openers.
- Commit messages: conventional commits (feat:, fix:, blog:, chore:, docs:).
