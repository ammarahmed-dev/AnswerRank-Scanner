# AEOCheck - Claude Code Instructions

## Project
AEOCheck (www.aeocheck.co) is a SaaS that scans a public URL and scores its readiness for AI answer
engines (ChatGPT, Perplexity, Google AI Overviews). Plans: Free / Onetime / Pro / Agency.
Built and owned by Ammar Ahmed (solo). Vercel auto-deploys `main` to production.

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

## Environment
Never hardcode secrets. See `.env.example` for the full list. Server code reads env at runtime;
the build succeeds without any env vars set.

---

## Autonomous work (weekend routine)

When a session is started to "continue the roadmap":
1. Read `docs/ROADMAP.md`. Pick the first unchecked item in the lowest-numbered phase
   (skip items marked as owner actions or blocked). Do 1-3 items per session, smallest first.
2. Branch from latest `main`: `claude/roadmap-<short-slug>`. Never push to `main` directly,
   never merge your own PR, never force-push someone else's branch.
3. Implement with minimal, focused diffs that match the surrounding code style.
4. Verify: `npx tsc --noEmit` and `npm run build` must pass (and tests once they exist).
5. Tick the item in `docs/ROADMAP.md` in the same PR. Add any newly discovered issues as new items.
6. Open a PR against `main` with: what changed, why, how it was verified, and any owner actions
   (env vars to set, migrations to run). Migrations are never applied automatically.
7. Stop and leave a note in the PR instead of guessing when a change needs a product decision,
   touches pricing/plan limits, deletes user data, or needs production credentials.

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
