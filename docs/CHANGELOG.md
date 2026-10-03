# Changelog

Newest first. Every autonomous session adds an entry: date, what shipped, how it was verified, follow-ups.

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
