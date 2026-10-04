# AEOCheck Roadmap

Source of truth for planned work. Claude owns and operates AEOCheck (see CLAUDE.md,
"Autonomous operation"): sessions pick the first unchecked item in the lowest-numbered phase,
ship it to production, and tick it here in the same change. Keep items small enough to ship
in one session. Claimed items have a `claude/wip-*` branch.

Status legend: `[ ]` todo, `[x]` done, `[~]` in progress / partially done (add a note).

Based on the full code review from 2026-10-03.

---

## Phase 1 - Critical revenue and security fixes

- [x] Paywall: guest/free scans were returned with `isFullReport: true`, unlocking the paid report for everyone (`app/api/scan/route.ts`)
- [x] Lemon Squeezy webhook: respect subscription `status`/`ends_at`, handle expired/refunded/resumed/payment-failed, allow downgrades, return 500 on DB failure so LS retries
- [x] Drop the `USING (true)` select policy on `compare_runs` (all reads go through the service role)
- [x] Remove committed test-account passwords from `AUDIT.md` (owner must still rotate/delete the accounts)
- [x] `/api/cron/followup-email` accepted `Bearer undefined` when `CRON_SECRET` was unset
- [x] SSRF hardening: shared `assertPublicUrl` (IPv6 brackets, mapped IPv4, CGNAT, 0.0.0.0, ULA), applied to competitor URLs, monitor URLs, audit crawler and every redirect hop; DNS re-checked at connect time (rebinding-safe undici agent)
- [x] Upgrade `next` to the patched 16.x release and apply non-breaking `npm audit fix`
- [x] Remaining high advisories: replaced `@vercel/og` with built-in `next/og`, dropped `@tabler/icons-webfont` (dashboard icons now Lucide); `npm audit` reports 0 vulnerabilities

## Phase 2 - Foundations for safe automation

- [x] CI workflow: typecheck + build on every push and PR (`.github/workflows/ci.yml`)
- [x] Rewrite `CLAUDE.md` so it matches the real stack (Next 16, Supabase auth, root `app/` + `lib/`, DeepSeek/OpenRouter/Gemini)
- [x] Add a test runner (Vitest) and unit tests for `lib/url-safety.ts`, `lib/usage-limits.ts` (key derivation), the webhook plan mapping and `lib/score-engine.ts`; run them in CI (`npm test`, `tests/`)
- [x] Add ESLint (`eslint-config-next`) and run it in CI (`npm run lint`, 0 errors)
- [x] Remove dead code: `/api/analyze`, `lib/score.ts`, `lib/openai.ts`, `lib/polar.ts`, `/api/stats/increment`, unused deps (`@polar-sh/nextjs`, `zod`, `openai`, `@google/genai`)
- [x] Remove committed logs (`dev.log`, `.next-dev-vs.log`) and `current_info.txt`; untrack `.claude/settings.local.json`
- [x] Fix `.env.example` (document `*_MONTHLY_*` limits, Lemon Squeezy vars, `CRON_SECRET`; remove Polar)
- [x] Rewrite `README.md` to describe the current product
- [x] Fix workflow script injection: inputs/step outputs passed via `env:` in blog-generate, backfill-images, content-draft and on-publish (pushing content to `main` is fine under the ownership model)

## Phase 3 - Correctness and reliability

- [x] Atomic usage counting: `reserve_scan_usage` / `release_scan_usage` (migration `20261003_atomic_scan_usage.sql`, tested on Postgres 16: 50 concurrent requests at limit 5 -> exactly 5 granted). Scan and compare reserve up front, release on failure; legacy fallback until the migration is applied
- [x] Server-side paywall: `/api/scan` and `/api/reports/[id]` remove AI guidance (recommendations, quick win, content gap) and competitor results for viewers without full access (`lib/report-access.ts`); stored reports stay complete. Issue list stays (preview counts need it; fix text is static client content)
- [x] Public share links: "Copy share link" on reports (`/report?id=<uuid>`); `/api/reports/[id]` serves anyone with the link, owner-only unlocks, preview for everyone else; recipients do not trigger a scan or spend quota
- [x] Monitor cron: 4 concurrent scans within a 230 s budget (`lib/batch.ts`), oldest first, leftovers deferred to the next run; cron now daily (due thresholds unchanged, so email cadence is the same)
- [x] Reader fallback: fixed (it always failed: `X-Respond-With: no-content` made Jina return 400); HTML-only checks are "Not verified" (warn) on fallback scans, readability computed, CAPTCHA walls reported as blocked, report shows a limited-scan notice
- [x] Unify `isMasterAdmin`: admin only from MASTER_ADMIN_EMAILS via `/api/account` `isAdmin`; Agency customers no longer see the Admin tab / Master Admin badge
- [x] `getAuthContext`: profile is created only when missing (was a write on every authenticated request)
- [ ] BLOCKED (needs production schema): persist webhook events in `webhook_events` for idempotency and audit. The table exists in production but no migration defines its columns
- [ ] BLOCKED (needs production schema): base-schema migration that recreates `profiles`, `webhook_events`, `app_stats` from scratch; retire `supabase-schema.sql`
- [x] Fix stale copy: welcome email scan count from config, removed fake "87/100" stat (UA domain and APP_URL fixed earlier)
- [x] `UpgradeButton`: show checkout errors to the user; `/upgrade/success` now redirects to `/dashboard?upgraded=1`
- [x] Encode PostgREST filter values built from route params (audit scan, monitor scan); the rest use URLSearchParams
- [x] Remove debug `console.log` calls in `/api/compare`
- [~] Lint debt: internal links -> `next/link`; dashboard inner components no longer remount every render; AuditClient declaration order fixed (all three rules back to error). Remaining: `react-hooks/set-state-in-effect` (10 warnings, mostly fetch-then-set patterns)
- [x] "25 AEO and GEO checks" is now true: added Canonical URL and Answer-Ready Headings (question-style H2/H3) checks; the engine runs exactly 25 (test-guarded)

## Phase 4 - Product upgrades

- [~] Real AI visibility tracking (spec in docs/RESEARCH.md): engine library (`lib/ai-visibility.ts`, Perplexity Sonar + Gemini grounded search: mention, citation, list position, rates) and admin-only `POST /api/ai-visibility` behind `AI_VISIBILITY_ENABLED` shipped. Next, once the owner decides plan placement:
  - [ ] `ai_visibility_runs` table (additive migration) and history
  - [ ] Tracker UI on the report/dashboard (prompts editor, per-engine results, trend)
  - [ ] Weekly runs for monitored brands via the monitor cron
  - [ ] Add OpenAI (Responses API web search) and Google AI Overviews (SERP API) engines
- [x] AI crawler access: new robots.txt parser (`lib/robots.ts`) with correct grouping, wildcard fallback, comments, longest-match; covers 12 AI crawlers incl. OAI-SearchBot, Claude-SearchBot, Perplexity-User, Google-Extended (was a wrong `googlebot-extended` token). `llms.txt` was already scored
- [x] Monitor history chart (sparkline already existed) and score-drop email alerts: drops of 5+ points get an alert subject, a banner naming the categories that fell, per-category deltas and a re-scan link (`lib/monitor-email.ts`)
- [~] "Limit reached" email shipped (once per month per user, `lib/limit-email.ts`; needs migration `20261003_limit_email.sql` and `RESEND_API_KEY`). Onboarding: welcome (day 0) and follow-up (day 3) already exist; a day-7 tips email is still open
- [ ] Split `HomePageClient.tsx`, `ReportSectionNew.tsx`, `DashboardClient.tsx` into smaller components
- [~] Consolidate icon libraries: Tabler webfont dropped; Lucide and Phosphor both remain (standardize on one) - Phosphor is only used for filled icons in 2 homepage files; swapping would visibly change the homepage for little gain (icons are tree-shaken). Low priority.
- [ ] Homepage mobile performance (Lighthouse mobile, local build: 73, FCP 2.8 s, LCP 4.6 s, TBT ~190 ms; production via proxy: 50):
  - [ ] Lazy-load the Supabase browser client (218 KB chunk incl. Realtime) - `lib/supabase-browser.ts` has ~20 call sites in 17 files; make it async and load after first paint (auth is high-risk: test login, dashboard, scan with token)
  - [ ] Move static homepage sections out of the 1,300-line `HomePageClient.tsx` into server components to cut hydration work
  - [ ] Reduce render-blocking CSS (single ~18 KB-unused global stylesheet)
- [~] Uptime check: `.github/workflows/uptime.yml` every 15 min, opens/closes a `uptime` GitHub issue (owner gets GitHub notifications). Error monitoring (Sentry) still needs an account (owner)

## Phase 5 - Continuous streams (run every weekend once Phases 1-3 are done or blocked)

- Features: grow AEOCheck into the best AEO/GEO tool for its price. Source ideas from
  `docs/RESEARCH.md`, add each as a concrete item here, then build it.
  - [x] Free llms.txt generator tool at `/tools/llms-txt-generator` (homepage + sitemap pages,
    ranked and grouped; 10 per month per client/IP; SSRF-safe fetches). Funnels to the scanner.
- UI/UX: polish the scan flow, report, dashboard and marketing pages; mobile first; measure with
  Lighthouse and fix regressions.
- Blog: up to 2 useful posts per weekend from `content/topical-map.json` and research.
  - [x] 2026-10-03: `technical-aeo-guide` (technical pillar hub), `robots-txt-ai-crawlers`
  - [ ] Next: `how-to-get-cited-by-chatgpt` and `measure-ai-search-traffic` (pillar hubs already linked from published posts; temporary redirects in `next.config.ts` until written - remove the redirect when publishing), `ai-crawlers-list`, `llms-txt-guide`
- Research: weekly scan of AI search changes and competitor tools; update `docs/RESEARCH.md`.
- Maintenance: dependency updates (minor/patch weekly, majors with care), `npm audit`, runtime errors.

---

## Owner actions (need dashboard/credential access Claude does not have)

- DECISION NEEDED (marketing claim accuracy): the homepage stats bar says "5,700+ scans run", while
  `/api/stats` reports 977, and that already includes a hard-coded +500 (`app/api/stats/route.ts`).
  If scans from before reports were persisted justify a higher number, record the real figure;
  otherwise Claude recommends showing the real count and removing the +500.

- DECISION NEEDED (what plans include): AI Visibility Tracker placement. Claude recommends: Pro =
  10 prompts tracked weekly on 2 engines, Agency = 50 prompts, Free = one-off 3-prompt sample on
  the report as an upgrade hook. Cost ~ $1 per tracked brand per month (docs/RESEARCH.md).
  To try it now as admin: set `AI_VISIBILITY_ENABLED=true` plus `PERPLEXITY_API_KEY` and/or
  `GEMINI_API_KEY` in Vercel, then POST /api/ai-visibility.

- DECISION NEEDED (plan limits, hard limit): the pricing page lists "1 monitored URL" for Free
  (`PLAN_LIMITS.free.monitorUrls`), but `/api/monitor` rejects all Free users ("Monitor requires a
  Pro plan"). Either let Free monitor 1 URL (server change) or remove it from the Free plan copy.
  Claude recommends allowing 1 monitored URL on Free: it matches what is advertised and drives retention.

- Rotate or delete the test accounts whose passwords were committed in `AUDIT.md` (still in git history)
- Set `CRON_SECRET`, `RESEND_API_KEY`, `INTERNAL_API_SECRET` in Vercel
- Run new migrations in `supabase/migrations/` against production (Supabase SQL editor), in order:
  `20261003_drop_public_compare_runs_policy.sql`, `20261003_atomic_scan_usage.sql`, `20261003_limit_email.sql`
- Google Search Console automation is broken: the GSC service account is rejected
  ("invalid_grant: account not found"), so on-publish and the weekly gsc-feedback job cannot submit
  sitemaps or read data. Create a new service account key, add it as a user in Search Console, and
  update the `GSC_CLIENT_EMAIL` / `GSC_PRIVATE_KEY` GitHub secrets. IndexNow (Bing) still works.
- Optional: AI cover images stopped working (Hugging Face no longer serves FLUX.1-schnell via the
  free `hf-inference` provider). Covers now fall back to branded images automatically. To get AI
  illustrations back, add Hugging Face inference credits (the script tries provider "auto" first).
- Export the production schema so Claude can write the base migration and use `webhook_events`:
  `npx supabase db dump --schema-only > supabase/schema.sql` (or Supabase dashboard > Database > Schema), then commit it
- In Lemon Squeezy, make sure the webhook subscribes to: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_payment_failed`
