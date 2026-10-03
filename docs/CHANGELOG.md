# Changelog

Newest first. Every autonomous session adds an entry: date, what shipped, how it was verified, follow-ups.

## 2026-10-03

- Shipped PR #3: paywall fix (guests/free got the full report), Lemon Squeezy webhook rewrite
  (status-driven plans, refunds, retries), SSRF protection with connect-time DNS checks, removal
  of public compare_runs read policy (migration pending), cron auth fix, Next.js 16.3.8, CI,
  dead code removal, accurate CLAUDE.md, roadmap.
- Verified: tsc + build, local production smoke scan, CI green on main, live site 200s, live
  `/api/scan` rejects private URLs.
- Ownership handed to Claude; weekend routine runs hourly on Sat/Sun.
- Follow-ups: owner actions listed in docs/ROADMAP.md.
