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
npm test              # Vitest unit tests in tests/, must pass
```
There is no ESLint config yet (tracked in docs/ROADMAP.md Phase 2).
Playwright + Chromium are available in cloud sessions for visual checks: install `playwright-core`
in a scratch dir and launch `/opt/pw-browsers/chromium-*/chrome-linux/chrome`. Against the live site,
route through the sandbox proxy (`proxy: { server: process.env.HTTPS_PROXY }`) and trust its CA with
`--ignore-certificate-errors-spki-list=<sha256 SPKI of /root/.ccr/agent-proxy-ca.crt>`.
Stop local servers with `kill $(pgrep -f "[n]ext-server")` (a plain `pkill -f "next start"` also
matches and kills your own shell).

## Verification recipes (learned the hard way)
- Auth UI (header menu, dashboard, audit, admin) renders nothing useful unless the build has
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The public anon key is in the live
  site's JS chunks (`role: anon`). Env vars do not persist between Bash calls: export them in the
  same command as `npm run build` and `next start`.
- Logged-in pages: set `localStorage["sb-<project-ref>-auth-token"]` with a fake session via
  `addInitScript` and mock `/api/account`, `/api/audit/**` etc. with `page.route`. No real login.
- Stale `.next` can serve an old CSS chunk locally: `rm -rf .next` before judging a CSS change.
- Refactors that must not change visuals: build `origin/main` in a `git worktree` (run `npm ci`
  there, a symlinked node_modules breaks Turbopack), serve both on different ports, screenshot
  full pages at 1280 and 390 px with animations disabled and compare with `pixelmatch` (install
  `pngjs pixelmatch` next to `playwright-core`). Zero differing pixels is the bar.
- Moving CSS between files changes cascade order: check shorthand vs longhand (`padding` vs
  `padding-top`) and media-query overrides, not just class names.
- Lighthouse lab scores swing 0.1+ between runs and cannot see Google Fonts from the sandbox: use
  several runs and report ranges, never a single number. Check HTML/bundle bytes for real wins.
- curl cannot see client-rendered text (`isClient &&` blocks, hover menus): verify those with
  Playwright against the live site, not by polling curl.
- Scanner changes: scan a spread of real sites before and after (`POST /api/scan` streams SSE;
  take the `event: result` block) and compare against the raw HTML. Scoring changes move
  monitored scores, so only ship changes that cannot lower a score or say so in the changelog.

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
   `claude/wip-<short-slug>`. A wip branch whose head is already contained in `origin/main`
   (`git merge-base --is-ancestor`) is released/done. When finished, release your claim by pushing
   the shipped `main` commit to it (branch deletion may be refused by the git proxy).
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
- Publishing: commit each new post on its own (separate from other content edits). The
  on-publish workflow only reads the last commit and generates a cover image for the first
  changed post with `coverImage: ""`, then pings IndexNow/GSC. Spokes must link their pillar hub
  (link-lint) - never link a planned post that does not exist yet; write the hub first.
- MDX supports GitHub-flavored Markdown (tables, task lists) via remark-gfm.

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
