# AEOCheck Roadmap

Source of truth for planned fixes and upgrades. Autonomous sessions (weekend routine)
pick the first unchecked item in the lowest-numbered phase, ship it, and tick it here
in the same pull request. Keep items small enough to land in one PR.

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
- [ ] Remaining high advisories: `sharp` via `@vercel/og` 0.x (upgrade to `@vercel/og` 1.x and re-test `/api/og*` routes) and the `@tabler/icons-webfont` build chain (dropping the webfont fixes it, see Phase 4)

## Phase 2 - Foundations for safe automation

- [x] CI workflow: typecheck + build on every push and PR (`.github/workflows/ci.yml`)
- [x] Rewrite `CLAUDE.md` so it matches the real stack (Next 16, Supabase auth, root `app/` + `lib/`, DeepSeek/OpenRouter/Gemini)
- [ ] Add a test runner (Vitest) and unit tests for `lib/url-safety.ts`, `lib/usage-limits.ts` (key derivation), the webhook plan mapping and `lib/score-engine.ts`; run them in CI
- [ ] Add ESLint (`eslint-config-next`) and run it in CI
- [x] Remove dead code: `/api/analyze`, `lib/score.ts`, `lib/openai.ts`, `lib/polar.ts`, `/api/stats/increment`, unused deps (`@polar-sh/nextjs`, `zod`, `openai`, `@google/genai`)
- [x] Remove committed logs (`dev.log`, `.next-dev-vs.log`) and `current_info.txt`; untrack `.claude/settings.local.json`
- [x] Fix `.env.example` (document `*_MONTHLY_*` limits, Lemon Squeezy vars, `CRON_SECRET`; remove Polar)
- [ ] Rewrite `README.md` to describe the current product
- [ ] Fix `blog-generate.yml` script injection (pass `inputs.keyword` via `env:`), and make content workflows open PRs instead of pushing to `main`

## Phase 3 - Correctness and reliability

- [ ] Atomic usage counting: Postgres function `increment_scan_usage(client_key, usage_date, limit)` returning the new count, called via RPC; replace read-then-write in `lib/usage-limits.ts`
- [ ] Server-side paywall: strip paid sections (full issue list beyond top 3, AI insights detail, competitor rows) from `/api/scan` and `/api/reports/[id]` responses when the viewer lacks full access
- [ ] Public share links: tokenized read-only report view (`/r/[token]`) that does not require login and does not re-run a scan; stop `/report?url=` from spending the recipient's quota
- [ ] Monitor cron: process in batches with a time budget, resume next run; parallelize with a small concurrency limit
- [ ] Jina fallback: mark reports scanned via reader fallback and skip/neutralize meta+schema checks instead of failing them
- [ ] Unify `isMasterAdmin` (remove the plan-based version in `lib/access.ts`; expose admin flag from `/api/account`)
- [ ] `getAuthContext`: avoid the profile upsert on every request (only when the profile read returns nothing)
- [ ] Persist webhook events in `webhook_events` for idempotency and audit
- [ ] Base-schema migration that recreates `profiles`, `webhook_events`, `app_stats` from scratch; retire `supabase-schema.sql`
- [ ] Fix stale copy: welcome email scan count from config, remove fake "87/100" stat, scraper User-Agent domain, single `NEXT_PUBLIC_APP_URL` with `www`
- [ ] `UpgradeButton`: show checkout errors to the user; remove dead `/upgrade/success` confirm call
- [ ] Encode all PostgREST filter values built from route params (`audit_runs?id=eq.${id}` etc.)
- [ ] Remove debug `console.log` calls in `/api/compare`

## Phase 4 - Product upgrades

- [ ] Real AI visibility tracking: query AI engines (Perplexity API, OpenAI with web search, Gemini grounding) with category prompts and record whether the brand is mentioned/cited; store per-run results; Pro/Agency feature
- [ ] Score `llms.txt` presence and AI crawler access (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) explicitly
- [ ] Monitor history chart and score-drop email alerts
- [ ] "Limit reached" email and a 3-step onboarding sequence via Resend
- [ ] Split `HomePageClient.tsx`, `ReportSectionNew.tsx`, `DashboardClient.tsx` into smaller components
- [ ] Consolidate icon libraries (drop the global Tabler webfont)
- [ ] Error monitoring (Sentry) and uptime check

---

## Owner actions (cannot be done from code)

- Rotate or delete the test accounts whose passwords were committed in `AUDIT.md` (still in git history)
- Set `CRON_SECRET`, `RESEND_API_KEY`, `INTERNAL_API_SECRET` in Vercel
- Run new migrations in `supabase/migrations/` against production (Supabase SQL editor)
- In Lemon Squeezy, make sure the webhook subscribes to: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_payment_failed`
