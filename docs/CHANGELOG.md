# Changelog

Newest first. Every autonomous session adds an entry: date, what shipped, how it was verified, follow-ups.

## 2026-10-03 (session 20)

- Monitor emails: a score drop of 5+ points now sends an alert ("Alert: your AEO score for X
  dropped N points") with the categories that fell and a re-scan button; every email shows
  per-category changes since the last scan. Monitor labels are now HTML-escaped in emails
  (they were inserted raw), and links point at www.aeocheck.co directly.
- Verified: 106/106 tests (subjects, alert threshold, category drops, escaping), tsc, lint,
  build; alert email rendered and checked visually. Uptime workflow first run: success.

## 2026-10-03 (session 19)

- Fixed 404s from published posts: `/blog/best-aeo-tools` now redirects permanently to the real
  post; the planned hubs `how-to-get-cited-by-chatgpt` and `measure-ai-search-traffic` redirect
  temporarily to the closest existing posts until they are written.
- Uptime monitoring: GitHub Actions checks `/`, `/pricing`, `/blog`, `/api/stats` every 15 minutes
  (3 attempts each) and opens an "uptime" issue on failure, closing it on recovery.
- Verified: build, lint; redirects (308/307) on a local production build; manual uptime run.

## 2026-10-03 (session 18)

- Blog covers: AI cover generation fails (Hugging Face dropped FLUX.1-schnell from its free
  provider). Added a branded cover route (`/api/og/post?title=&tag=`) and made the backfill
  script fall back to it, so every new post gets a cover with no API keys. Generated covers for
  the two new posts.
- Workflows: content jobs rebase before pushing, so two publish runs no longer race on `git push`.
- Found (owner action): Google Search Console service account is rejected ("account not found").
- Verified: tsc, lint, tests, build; covers render on both posts and the blog index, og:image
  points at the new covers.

## 2026-10-03 (session 17)

- Blog: published "Technical AEO: How to Make Your Site Machine-Readable for AI Search" (technical
  pillar hub) and "robots.txt for AI Crawlers: What to Allow, What to Block", fact-checked against
  OpenAI, Anthropic, Perplexity and Google crawler docs (docs/RESEARCH.md).
- Fixed: Markdown tables rendered as raw `|---|` text on live posts (no GFM support in the MDX
  renderer); added remark-gfm and table styles. Removed an unused stylesheet.
- Fixed: blog bylines, author schema and the team page said "Ummar Ahmed"; corrected to Ammar
  Ahmed (completing the June fix that only covered the Organization schema).
- Verified: build, tests, lint, link-lint for new posts; Playwright render of both posts and the
  previously broken table (real table, FAQ schema present, all internal links 200).

## 2026-10-03 (session 16)

- AI crawler check severity now follows the vendors' documentation: blocking an AI *search*
  crawler (OAI-SearchBot, Claude-SearchBot, PerplexityBot) fails, because the site cannot appear
  in those answers; blocking only *training* crawlers (GPTBot, ClaudeBot, Google-Extended,
  Applebot-Extended, ...) is a warning, because AI search visibility is unaffected. Previously a
  GPTBot-only block was reported as invisibility to ChatGPT, which is wrong.
- Verified: 100/100 tests (search vs training cases), tsc, lint, build; checked against the real
  nytimes.com robots.txt (blocks the search crawlers too -> fail, correctly).

## 2026-10-03 (session 15)

- Research: AI visibility tool market and engine costs recorded in docs/RESEARCH.md, with a spec
  for an AI Visibility Tracker (the feature the marketing already promises).
- Shipped dark: `lib/ai-visibility.ts` asks Perplexity (Sonar) and Gemini (Google Search
  grounding) buyer questions and records brand mention, domain citation and list position, with
  mention/citation rates. `POST /api/ai-visibility` is admin-only and returns 404 unless
  `AI_VISIBILITY_ENABLED=true`. No customer-facing change until the owner picks plan placement.
- Verified: 98/98 tests (answer analysis, both engine parsers, failure isolation), tsc, lint,
  build; route returns 404 with the flag off.

## 2026-10-03 (session 14)

- AI crawler check rewritten (`lib/robots.ts`). The old parser missed crawlers listed in grouped
  `User-agent` blocks (so a blocked GPTBot could show as allowed), used the wrong Google token
  (`googlebot-extended` instead of `Google-Extended`), did not strip comments, and treated a
  site-wide `Disallow: /` as a warning. Now: proper robots.txt grouping and precedence, and 12 AI
  crawlers including OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Perplexity-User,
  Applebot-Extended. Blocking a major AI search crawler fails the check; minor ones warn.
- Verified: 90/90 tests (7 robots cases), tsc, lint, build; real robots.txt files: cnn.com
  (blocks all AI crawlers -> fail), nytimes.com file (GPTBot + Google-Extended blocked),
  aeocheck.co (explicitly allowed), stripe.com (open).

## 2026-10-03 (session 13)

- Dashboard: sidebar, tabs and mobile bottom nav were components declared inside the dashboard
  component, so React remounted them on every render; they are now plain render functions
  (same output, no remounts). AuditClient: scan loop declared before the effect that starts it.
- ESLint: `static-components` and `immutability` back to errors (0 errors, 24 warnings).
- Verified: tsc, lint, 83/83 tests, build; dashboard and audit pages load without errors
  logged out (desktop + mobile). Logged-in tab behavior could not be exercised without an account.

## 2026-10-03 (session 12)

- Navigation: 53 internal links converted from `<a>` to Next.js `<Link>` (client-side navigation,
  no full page reloads); ESLint now errors on new plain internal links.
- Fixed (pre-existing, confirmed on production): links to homepage sections from other pages
  (e.g. "FAQ" from /pricing -> /#faq) landed at the top of the page because ScrollToTop ran on
  every route change. It now scrolls to the linked section; normal navigation still starts at top.
- Marked webhook-event persistence and the base-schema migration as blocked on a production
  schema export (owner action added).
- Verified: tsc, lint (0 errors), 83/83 tests, build; Playwright: cross-page hash link, same-page
  hash link, direct /#faq load on mobile, normal footer link, compared against production.

## 2026-10-03 (session 11)

- Auth: removed a database write from every authenticated API request; the profile is created
  only on a user's first request. Covered by new tests (guest, existing user, new user, expiry).
- Verified: 83/83 tests, tsc, lint, build.

## 2026-10-03 (session 10)

- Monitor cron scales: scans run 4 at a time inside a 230 s budget, most overdue first; anything
  left over is deferred to the next run instead of being dropped by the 300 s timeout. The cron
  now runs daily (09:15 UTC) so a backlog never waits a week; weekly/monthly email cadence is
  unchanged because monitors are only scanned when due.
- Verified: 79/79 tests (budget helper; cron route with mocked DB and scanner: auth, ordering,
  snapshots, failure isolation), tsc, lint, build.

## 2026-10-03 (session 9)

- Fixed: the reader fallback for sites that block direct scraping never worked. It sent
  `X-Respond-With: no-content`, which Jina rejects with HTTP 400, so every such site failed with
  "We couldn't scan this URL". Sites like Indeed and Glassdoor now scan.
- Fairer scores for those scans: signals that only exist in page code (meta tags, schema, links,
  images, author/date markup) are "Not verified" (neutral) instead of failed; readability is now
  computed from the reader text; the report explains the limited scan.
- CAPTCHA walls (reader returns a title and no content) are reported as blocked instead of
  producing a report about an empty page.
- Verified: 73/73 tests, tsc, lint, build; real scans: indeed.com and glassdoor.com (limited
  scans), g2.com and medium.com (honest blocked error), crunchbase.com (normal); notice rendered.

## 2026-10-03 (session 8)

- Scanner: two new checks, bringing the engine to the 25 checks the site advertises:
  - Canonical URL (metadata): pass when set on the same domain, warn for cross-domain, fail if missing.
  - Answer-Ready Headings (AI readiness): question-style H2/H3 headings that answer engines can quote
    (pass >= 2, warn 1, fail 0). Backs the "answer extraction structure" claim in the copy.
- Scores shift slightly for pages missing these signals (example.com 43 -> 40; aeocheck.co 96,
  stripe.com 87 pass both).
- Verified: 69/69 tests (count, canonical and heading cases), tsc, lint, build; real scans of three
  sites; report renders with the larger issue list and no errors.

## 2026-10-03 (session 7)

- Checkout failures now show an error message under the upgrade button (previously silent).
- Admin UI (Admin tab, "Master Admin" badge) only for MASTER_ADMIN_EMAILS; Agency customers
  were shown it because `/api/account` treated the agency plan as admin.
- Monitor page showed a 5-URL limit for Onetime; server and pricing allow 1. UI now matches.
- Email copy: welcome email uses the configured free scan limit; removed an invented "87/100"
  statistic from the follow-up email. Tests guard both.
- Legacy `/upgrade/success` (Polar) redirects to `/dashboard?upgraded=1`; removed its dead
  `/api/checkout/confirm` call. Encoded route params in PostgREST filters; removed compare debug logs.
- Found (needs owner decision): Free plan advertises 1 monitored URL but the API blocks Free users.
- Verified: 66/66 tests, tsc, lint, build; local smoke (pages 200, redirect 307, compare works,
  no compare debug output).

## 2026-10-03 (session 6)

- Share links: reports have a "Copy share link" button. Anyone with the link sees the report
  without logging in; non-owners get the free preview (with upgrade CTA), so sharing an unlocked
  report never gives away the paid sections. Recipients no longer re-run a scan or spend quota.
  Link previews use the (now working) score OG image.
- Verified: 63/63 tests, tsc, lint, build; Playwright end-to-end: guest scan -> copy link ->
  fresh browser opens link, sees preview, correct page title, zero scan requests, no errors.
- Documented the browser-testing recipe (proxy + CA) in CLAUDE.md.
- Fixed: unknown report IDs returned 500 in production (fell through to the dev-only SQLite
  store); they now return 404.

## 2026-10-03 (session 5)

- Server-side paywall: preview viewers (guest/free, onetime off their locked URL) no longer
  receive paid AI guidance or competitor results from `/api/scan` or `/api/reports/[id]`.
  Stored reports stay complete so upgrades unlock everything. Responses carry `redacted: true`.
- Report page: a cached redacted preview is shown instantly and refetched for signed-in users
  (so an upgrade takes effect); guests keep the cached preview. Caught in browser testing: an
  earlier version of this change showed guests "Report unavailable" after scanning.
- Verified: 62/62 tests (5 new), tsc, lint, build; guest scan API returns redacted result;
  Playwright render of the report preview on desktop and mobile with no console errors.

## 2026-10-03 (session 4)

- Atomic usage limits: scans and compares now reserve a unit up front through the
  `reserve_scan_usage` Postgres function (released if the work fails), so parallel requests can no
  longer exceed plan limits. Falls back to the previous logic until the migration is applied.
- Compare: usage is reserved after input validation (invalid input no longer touches the counter).
- Verified: migration tested on a local Postgres 16 (sequential limit, release, limit 0,
  50 concurrent requests at limit 5 -> exactly 5 granted, anon denied, service_role allowed);
  57/57 unit tests, tsc, lint, build; local scan + compare smoke tests.
- Owner action: apply `supabase/migrations/20261003_atomic_scan_usage.sql`.

## 2026-10-03 (session 3)

- ESLint 9 with `eslint-config-next` (`npm run lint`), enforced in CI. 0 errors; 80 warnings of
  existing debt (internal `<a>` links, React hook patterns) tracked in the ROADMAP.
- Removed unused imports; escaped quotes in legal page text (rendered text unchanged).
- Rewrote README for the current product, stack and scripts.
- Found: marketing says "25 checks" while a scan returns 23; added to ROADMAP.
- Verified: tsc, lint (exit 0), 52/52 tests, production build; previous CI run on main green.

## 2026-10-03 (session 2)

- Security: `npm audit` now 0 vulnerabilities. Replaced `@vercel/og` with built-in `next/og`;
  removed `@tabler/icons-webfont` (dashboard nav icons switched to Lucide). 204 packages fewer.
- Fixed: report share images (`/api/og/report`) returned an empty body in production
  (satori rejected divs without explicit `display: flex`).
- Tests: added Vitest (`npm test`) with 52 unit tests covering URL safety (SSRF), usage-limit keys,
  the score engine and the Lemon Squeezy webhook (signature, cancel/expire/downgrade, stale
  subscriptions, refunds, retry on DB failure). CI now runs them.
- Security: GitHub workflows pass inputs/step outputs via `env:` instead of interpolating into shell.
- Verified: clean `npm ci`, tsc, 52/52 tests, production build; local `next start` smoke test
  (pages 200, all OG images render and were visually checked, live scan returns a result).
- Follow-ups: ESLint (Phase 2), README rewrite; standardize on one icon library (Lucide vs Phosphor).

## 2026-10-03 (session 1)

- Shipped PR #3: paywall fix (guests/free got the full report), Lemon Squeezy webhook rewrite
  (status-driven plans, refunds, retries), SSRF protection with connect-time DNS checks, removal
  of public compare_runs read policy (migration pending), cron auth fix, Next.js 16.3.8, CI,
  dead code removal, accurate CLAUDE.md, roadmap.
- Verified: tsc + build, local production smoke scan, CI green on main, live site 200s, live
  `/api/scan` rejects private URLs.
- Ownership handed to Claude; weekend routine runs hourly on Sat/Sun.
- Follow-ups: owner actions listed in docs/ROADMAP.md.
