# AEOCheck Roadmap

Source of truth for planned work. Claude owns and operates AEOCheck (see CLAUDE.md,
"Autonomous operation"): sessions pick the first unchecked item in the lowest-numbered phase,
ship it to production, and tick it here in the same change. Keep items small enough to ship
in one session. Claimed items have a `claude/wip-*` branch.

Status legend: `[ ]` todo, `[x]` done, `[~]` in progress / partially done (add a note).

Based on the full code review from 2026-10-03.

---

## Phase 1 - Critical revenue and security fixes

- [x] (2026-10-27, audit A02/A11) Stop unavailable authenticated profile verification becoming Free/guest work; require bounded authoritative reads/bootstrap readback and a shared retryable 503 guard at every current API consumer. Valid rights/expiration and anonymous policy stay unchanged; client recovery and production signed-in acceptance remain open.


- [x] Paywall: guest/free scans were returned with `isFullReport: true`, unlocking the paid report for everyone (`app/api/scan/route.ts`)
- [x] Lemon Squeezy webhook: respect subscription `status`/`ends_at`, handle expired/refunded/resumed/payment-failed, allow downgrades, return 500 on DB failure so LS retries
- [x] Drop the `USING (true)` select policy on `compare_runs` (all reads go through the service role)
- [x] Remove committed test-account passwords from `AUDIT.md` (owner must still rotate/delete the accounts)
- [x] `/api/cron/followup-email` accepted `Bearer undefined` when `CRON_SECRET` was unset
- [x] SSRF hardening: shared `assertPublicUrl` (IPv6 brackets, mapped IPv4, CGNAT, 0.0.0.0, ULA), applied to competitor URLs, monitor URLs, audit crawler and every redirect hop; DNS re-checked at connect time (rebinding-safe undici agent)
- [x] Upgrade `next` to the patched 16.x release and apply non-breaking `npm audit fix`
- [x] Remaining high advisories: replaced `@vercel/og` with built-in `next/og`, dropped `@tabler/icons-webfont` (dashboard icons now Lucide); `npm audit` reports 0 vulnerabilities

- [x] (2026-10-25, audit A11) Propagate cancellation through manual monitor scans and stop disconnected audit scans before progress writes; bound ownership reads and retain already dispatched write outcomes. Durable jobs and signed-in acceptance remain open.

- [x] (2026-10-25, audit A07) Append audit page results and recalculate progress/aggregate/completion in a service-only transaction against current locked state; reject save-time duplicates and foreign targets. Durable jobs, leases and recovery remain open.

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

- [x] (2026-10-27, audit A12/A17) Correct live software-offer JSON-LD's negative monitor sentinel and unsupported catalog relationship; share existing published software offer facts and paid identifiers between pricing and checkout without changing prices, entitlements, variants or visible markup. Provider reconciliation/activation and other surfaces remain open.


- [x] (2026-10-27, audit A14) Resolve AI source destinations with bounded SSRF-safe HEAD checks; preserve unknown/capped/blocked outcomes and separate older citation methods. Destination checks are not answer entailment, live provider acceptance or ranking evidence; distributed spend and separate branded/unbranded series remain open.


- [x] (2026-10-27, audit A06/A11) Distinguish auxiliary-resource HTTP absence, scanner restrictions, invalid responses and incomplete fetches in saved/displayed evidence; use evidence-aware remediation and body-active deadlines without changing score credit/version. Reader provenance and crawler-purpose acceptance remain open.


- [x] (2026-10-27, audit A10/A14) Reconcile missing server SELECT/INSERT on ai_visibility_runs with explicit grants and RLS precondition; test actual base/repair SQL on clean/existing fixtures while preserving browser denial and saved observations. Production privilege verification gates operational acceptance; full baseline and live tracker/provider acceptance remain open.


- [x] (2026-10-27, audit A09/A11) Bound quota storage reads/reserve/release with ten-second deadlines, 4 KiB read/reserve JSON caps, redirect rejection and safe cleanup/logging. Keep uncertain reservations fail closed without retries; durable identity/expiry/reconciliation and signed-in acceptance remain open.


- [x] (2026-10-25, audit A03) Save a full one-time-plan report and consume its locked URL/counter in one service-only transaction; reject changed/exhausted rights and roll back both sides on failed writes. Purchase identity, up-front reservations and free-plan unlocked-report retests remain open.

- [x] (2026-10-25, audit A07) Recheck monthly/rolling audit caps and create the audit under an account transaction lock after discovery; keep early guards, preserve tier limits and reconcile the existing discovery-count field in historical installs. Durable discovery/job reservations remain open.

- [x] (2026-10-25, audit A08) Serialize monitor creation cap checks and inserts in a service-only per-account transaction; preserve current caps and duplicate handling, validate committed responses and fail closed without direct-write fallback. Signed-in and true contention acceptance remain open.

- [x] (2026-10-25, audit A08) Atomically insert monitor snapshots and advance schedules with a service-only owned-monitor RPC; share it across manual and cron scans and fail closed on persistence errors. Leases, idempotency and durable email outbox remain open.

- [x] (2026-10-25, audit A05) Record monitor scoring methods on new snapshots; suppress incompatible list/email deltas and break chart lines across changed/unknown methods. Nullable production column applied and verified; legacy observations preserved. Full signed-in/email acceptance remains open.

- [x] (2026-10-25, audit A05) Guard report/dashboard score and check deltas by recorded scoring-method compatibility; explain different/unknown methods without interpreting them as site improvement. Monitor/email history remains pending versioned snapshots.

- [x] (2026-10-25, audit A11) Bound remaining JSON application requests to 32 KiB, reject non-object roots, and validate contact/welcome field types before work. Checkout, monitor update and audit scan auth/ownership behavior is preserved. Signed webhook raw-body limits remain part of the separate billing work.

- [x] Atomic usage counting: `reserve_scan_usage` / `release_scan_usage` (migration `20261003_atomic_scan_usage.sql`, tested on Postgres 16: 50 concurrent requests at limit 5 -> exactly 5 granted). Scan and compare reserve up front, release on failure; legacy fallback until the migration is applied
- [x] Server-side paywall: `/api/scan` and `/api/reports/[id]` remove AI guidance (recommendations, quick win, content gap) and competitor results for viewers without full access (`lib/report-access.ts`); stored reports stay complete. Issue list stays (preview counts need it; fix text is static client content)
- [x] Public share links: "Copy share link" on reports (`/report?id=<uuid>`); `/api/reports/[id]` serves anyone with the link, owner-only unlocks, preview for everyone else; recipients do not trigger a scan or spend quota
- [x] Monitor cron: 4 concurrent scans within a 230 s budget (`lib/batch.ts`), oldest first, leftovers deferred to the next run; cron now daily (due thresholds unchanged, so email cadence is the same)
- [x] Reader fallback: fixed (it always failed: `X-Respond-With: no-content` made Jina return 400); HTML-only checks are "Not verified" (warn) on fallback scans, readability computed, CAPTCHA walls reported as blocked, report shows a limited-scan notice
- [x] Unify `isMasterAdmin`: admin only from MASTER_ADMIN_EMAILS via `/api/account` `isAdmin`; Agency customers no longer see the Admin tab / Master Admin badge
- [x] `getAuthContext`: profile is created only when missing (was a write on every authenticated request)
- [~] (2026-10-25, audit A02) Exact-body mutation receipts now commit atomically with whitelisted profile patches and optimistic state checks. Missing/failed writes stay retryable. Distinct-event ordering, failed/ignored inbox, authoritative recovery and live sandbox remain open; PR #9's fail-open implementation is superseded.
- [x] (2026-10-27, audit A10) Reconcile missing historical base definitions and retire the incomplete root schema entrypoint. Add the explicit fresh-install manifest and full real-SQL clean/known-historical upgrade tests, including RPC/access/FK/preserved-fixture checks. See supabase/README.md. Hosted Auth/Data API acceptance, arbitrary drift and lifecycle decisions remain open; no production bootstrap or DDL.
- [x] Fix stale copy: welcome email scan count from config, removed fake "87/100" stat (UA domain and APP_URL fixed earlier)
- [x] `UpgradeButton`: show checkout errors to the user; `/upgrade/success` now redirects to `/dashboard?upgraded=1`
- [x] Encode PostgREST filter values built from route params (audit scan, monitor scan); the rest use URLSearchParams
- [x] Remove debug `console.log` calls in `/api/compare`
- [~] Lint debt: internal links -> `next/link`; dashboard inner components no longer remount every render; AuditClient declaration order fixed (all three rules back to error). Unused variables and dead code removed (22 -> 17 warnings). Remaining: `react-hooks/set-state-in-effect` (11, fetch-then-set patterns in auth-adjacent clients: left alone on purpose, behavior risk outweighs the gain) and 6 intentional hard navigations via `window.location`
- [x] "25 AEO and GEO checks" is now true: added Canonical URL and Answer-Ready Headings (question-style H2/H3) checks; the engine runs exactly 25 (test-guarded)

## Phase 4 - Product upgrades

- [~] Real AI visibility tracking (spec in docs/RESEARCH.md): engine library (`lib/ai-visibility.ts`, Perplexity Sonar + Gemini grounded search: mention, citation, list position, rates) and admin-only `POST /api/ai-visibility` behind `AI_VISIBILITY_ENABLED` shipped. Next, once the owner decides plan placement:
  - [x] (2026-10-04) `ai_visibility_runs` table (migration `20261004_ai_visibility_runs.sql`), run history (`lib/ai-visibility-store.ts`, `GET /api/ai-visibility`)
  - [~] Admin-only tracker UI at `/ai-visibility` (noindex, not linked): brand + category + prompts editor, per-engine results, mention/citation history. Customer-facing placement on the report/dashboard waits for the plan decision
  - [ ] Weekly runs for monitored brands via the monitor cron
  - [ ] Add OpenAI (Responses API web search) and Google AI Overviews (SERP API) engines
- [x] AI crawler access: new robots.txt parser (`lib/robots.ts`) with correct grouping, wildcard fallback, comments, longest-match; covers 12 AI crawlers incl. OAI-SearchBot, Claude-SearchBot, Perplexity-User, Google-Extended (was a wrong `googlebot-extended` token). `llms.txt` was already scored
- [x] Monitor history chart (sparkline already existed) and score-drop email alerts: drops of 5+ points get an alert subject, a banner naming the categories that fell, per-category deltas and a re-scan link (`lib/monitor-email.ts`)
- [~] "Limit reached" email shipped (once per month per user, `lib/limit-email.ts`; needs migration `20261003_limit_email.sql` and `RESEND_API_KEY`). Onboarding: welcome (day 0) and follow-up (day 3) exist. A day-7 email is deliberately NOT planned: the follow-up footer promises "no more than 2 emails total" to new users
- [x] (2026-10-04) "Since your last scan" comparison: a retest or rescan of the same URL by a signed-in user stores a compact summary of the previous report (`previous`: score, date, check statuses) in the new report, and the report shows the score change plus which checks improved or got worse (`lib/report-diff.ts`). No migration; also shown on the sample report.
- [~] Split `HomePageClient.tsx`, `ReportSectionNew.tsx`, `DashboardClient.tsx` into smaller components. (2026-10-12) `ReportSectionNew.tsx` 1,373 -> 1,077 lines: types and pure helpers moved verbatim to `lib/report-view-model.ts`, `MetaRow`/`PriorityColumn` to `app/components/ReportParts.tsx`. Remaining: the report's JSX sections, `HomePageClient.tsx`, `DashboardClient.tsx`
- [~] Consolidate icon libraries: Tabler webfont dropped; Lucide and Phosphor both remain (standardize on one) - Phosphor is only used for filled icons in 2 homepage files; swapping would visibly change the homepage for little gain (icons are tree-shaken). Low priority.
- [ ] Homepage mobile performance (Lighthouse mobile, local build: 73, FCP 2.8 s, LCP 4.6 s, TBT ~190 ms; production via proxy: 50):
  - [x] (2026-10-04) Lazy-load the Supabase browser client on the shared layout + homepage (`lib/supabase-browser-lazy.ts`): initial homepage JS 951 KB -> 728 KB raw. Lighthouse lab score unchanged (chunk still loads, after hydration). Remaining static importers are auth/dashboard pages only. Was: Lazy-load the Supabase browser client (218 KB chunk incl. Realtime) - `lib/supabase-browser.ts` has ~20 call sites in 17 files; make it async and load after first paint (auth is high-risk: test login, dashboard, scan with token)
  - [x] (2026-10-04) Static homepage sections moved to server component `HomeStaticSections.tsx` (HomePageClient 1,308 -> 1,112 lines; initial JS 728 -> 689 KB raw; lab score unchanged). Remaining: pricing/FAQ/testimonials still in the client component; LCP (4.1 s) is dominated by CSS and the hero, see next item
  - [x] (2026-10-04) Fonts self-hosted via `next/font/google` (Geist + Geist Mono): removes two render-blocking cross-origin stylesheet requests to fonts.googleapis.com plus two preconnects from every page
  - [x] (2026-10-04) Split route-exclusive CSS out of `globals.css`: `app/audit/audit.css`, `app/vs/vs.css`, `app/dashboard/dashboard.css`, imported by their route components (global stylesheet 229.8 KB -> 195.1 KB minified; the rest loads only on those routes). Verified: all 2,494 rules preserved, cascade-flip check (shorthand-aware, across media contexts; `vs-cta-section` kept global because a later `.launch-section` media rule beat it), pixel-identical screenshots before/after on /vs/profound, /audit, /audit/[id], /dashboard at 1280 and 390 px.
  - [ ] Further CSS weight: the remaining global stylesheet is still one blocking request (`compare-*` 16 KB and `monitor-*` 11 KB are used by both their pages and the homepage tabs, so they cannot be split the same way). `experimental.optimizeCss` has no effect in the App Router
- [~] Uptime check: `.github/workflows/uptime.yml` every 15 min, opens/closes a `uptime` GitHub issue (owner gets GitHub notifications). Error monitoring (Sentry) still needs an account (owner)

## Phase 5 - Continuous streams (run every weekend once Phases 1-3 are done or blocked)

- [x] (2026-10-25, owner request) Apply long-query discovery to the private GSC export and improve the existing SaaS guide for relevant product-discovery and measurement intent; preserve original dates/title and distinguish intent candidates from verified query/page mappings.
- [~] Targeted joint query/page evidence for shortlisted long-query intents is implemented and runtime-verified through the reviewed Overview (PR #43); the earlier 40-row retrieval blocker is resolved. Assess matching-window organic performance after data catches up, keeping raw metrics private and avoiding word-count-only prioritization.


- [x] (2026-10-25, owner request) Research AEO/GEO service presentation using Brickell Digital and tool-plus-service references; document the existing CTA/contact flow and a scoped delivery plan in [SERVICES-PRESENTATION-PLAN.md](SERVICES-PRESENTATION-PLAN.md).
- [~] (A17/A15 priority) Deliver services plan S01-S03: one implementation page, scoped enquiry intake and existing shared/report CTA journey; then S04-S06 discovery, verified private attribution and qualification review. Preserve software pricing/rights and avoid promises of AI placement. Initial page and CTA path are implemented; production valid-enquiry/readback and notification acceptance remain open.


- Revenue plan (2026-10-12, owner request; rationale in docs/RESEARCH.md):
  - [~] Utility-keyword pages. Done 2026-10-12: robots.txt tester (`/tools/robots-txt-tester`, full RFC 9309 matching with `*`/`$`, shows the deciding rule; 30 per month per client/IP). Done 2026-10-14: Open Graph checker (`/tools/open-graph-checker`, reuses the meta checker engine with OG-focused title, H1 and FAQ). FAQ schema validator (`/tools/faq-schema-validator`, 2026-10-14, reuses the schema checker). Utility pages done; next measure them in GSC. Was: robots.txt tester (reuse `lib/robots.ts` against a URL), Open Graph / social preview checker (reuse meta checker), FAQ schema validator page (reuse schema checker, query-matched), each with FAQ + services CTA + links from related posts
  - [ ] One "how to fix" post per failing scanner check (25 checks), each ending in the matching tool and scanner CTA; replaces new AEO-jargon posts
  - [ ] Free-to-paid hook: weekly monitoring email for one URL on Free (needs plan-limit decision, see Owner actions) and the AI visibility tracker once keys exist
  - [ ] Lead tracking: weekly count of `contact_messages` with subject "Optimization services" in the changelog; add a one-click admin view if volume justifies it
  - [ ] Real user problems to solve next (verify each against support emails and the monitored-URL list before building): site-wide scan from a sitemap (top 10 pages, one ranked fix list), per-check "fix it for me" copy-paste snippets beyond the Fix Pack, shareable before/after report for agencies

- [x] (2026-10-12, owner request) Lead-gen CTA "Need help optimizing for AEO, GEO and SEO?" (`ServiceCta`) on every blog post, all tool pages and /ai-seo-audit; links to `/contact?subject=services`, which preselects the new "Optimization services" subject (saved in `contact_messages` and emailed via Resend). Track: count `subject = 'Optimization services'` rows to measure leads per week.

- Features: grow AEOCheck into the best AEO/GEO tool for its price. Source ideas from
  `docs/RESEARCH.md`, add each as a concrete item here, then build it.
  - [x] Free AI crawler checker at `/tools/ai-crawler-checker` (robots.txt rules per AI crawler,
    search vs training vs user agents; 30 per month per client/IP).
  - [x] Free FAQ schema generator (client-side, no server cost) at `/tools/faq-schema-generator`
  - [x] Free schema markup checker at `/tools/schema-checker` (JSON-LD parse, types, missing required/recommended props; 30 per month per client/IP); report issues for schema checks link to it
  - [x] (2026-10-04) Free robots.txt generator for AI crawlers (`/tools/robots-txt-generator`: four policies, per-crawler custom, sitemap, extra disallow paths; output round-trips through the scanner's own parser in tests) and Organization + WebSite schema generator (`/tools/organization-schema-generator`; output passes the schema checker in tests). Both run in the browser. Report issues for AI bot access, robots.txt and schema now link the matching generators.
  - [x] (2026-10-04) Free sitemap checker (`/tools/sitemap-checker`): discovers the sitemap via robots.txt or default paths, validates XML, URL count, duplicates, foreign/http/query URLs, lastmod dates, follows up to 5 child sitemaps, spot-checks 8 URLs for status codes; 20 per month per client/IP. The report's Sitemap issue links to it.
  - [x] (2026-10-04) Free meta tag checker (`/tools/meta-tag-checker`): title, description, canonical, Open Graph (graded by the scanner's own checks via `runDeterministicChecks`, so tool and report always agree) plus robots meta, viewport, lang, Twitter card, og:url vs canonical, with live search-result and social-card previews. Report issues for title, meta description, canonical and OG tags link to it.
  - [x] (2026-10-04) Article schema generator (`/tools/article-schema-generator`: Article/BlogPosting/NewsArticle with author, dates, image, publisher; validates dates and URLs; output passes the schema checker in tests). The report's Article Schema issue links to it.
  - [ ] Next tool candidates from GSC queries ("aeo score checker", "aeo tools", "aeo keyword tracker"): sitemap checker (parse sitemap.xml, lastmod, robots reference), meta tag / Open Graph preview checker, Article schema generator. Check /tools impressions in the GSC Overview first.
  - [x] `/tools` index page
  - [x] (2026-10-04) Traffic plan in `docs/GROWTH.md` and the first link-worthy asset: `/research/ai-readiness-study` (85 well-known sites; script `scripts/ai-readiness-study.mjs`, data `data/ai-readiness-study.json`). Badge shipped (`/tools/ai-readiness-badge`). Next: opt-in shareable report pages, study v2 with change over time, platform landing pages.
  - [x] (2026-10-04) Report "Fix Pack": generated robots.txt, Organization schema, llms.txt starter and head tags from the scan (full-report viewers). Zip download shipped. Article/FAQ prefill skipped on purpose (author and dates unknown).
  - [x] (market research 2026-10-04, see docs/RESEARCH.md) Reposition homepage/tools copy and metadata from "AEO" jargon toward "AI SEO / AI visibility" (keep AEO as secondary); no claims change.
  - [ ] Free AI brand-mention check (is my brand named in AI answers for 3 prompts): the biggest query family, but costs LLM calls. Blocked on owner: Perplexity/Gemini keys and budget (see Owner actions).
  - [ ] Affiliate slots (Semrush, HubSpot) on tool/blog pages with disclosure component. Blocked on owner: program sign-up IDs.
  - [x] Public "AI SEO audit" landing page (`/ai-seo-audit`) for the scanner aimed at the "ai seo audit / website audit for ai" queries.
  - [x] Content extractability tool at `/tools/content-extractability` (heading-opening passage analysis, 20 per month per client/IP, no AI cost)
  - [ ] Weigh a 26th "citable facts" check against the "25 checks" copy churn (docs/RESEARCH.md)
  - [ ] Before building more tools: read the GSC Overview (now available) to see which tools earn impressions. Candidates next: per-engine tips in the report (needs a primary source), a 26th "citable facts" check.
  - [x] Free llms.txt generator tool at `/tools/llms-txt-generator` (homepage + sitemap pages,
    ranked and grouped; 10 per month per client/IP; SSRF-safe fetches). Funnels to the scanner.
- UI/UX: polish the scan flow, report, dashboard and marketing pages; mobile first; measure with
  Lighthouse and fix regressions.
- Blog: up to 2 useful posts per weekend from `content/topical-map.json` and research.
  - [x] 2026-10-03: `technical-aeo-guide` (technical pillar hub), `robots-txt-ai-crawlers`
  - [x] 2026-10-05: `how-to-get-cited-by-chatgpt` hub published (redirect removed)
  - [ ] Next: `measure-ai-search-traffic` (pillar hubs already linked from published posts; temporary redirects in `next.config.ts` until written - remove the redirect when publishing), `ai-crawlers-list`, `llms-txt-guide`
- Research: weekly scan of AI search changes and competitor tools; update `docs/RESEARCH.md`.
- Search Console driven work (first report 2026-10-04, window 2026-09-03..10-01; very little traffic yet):
  - [x] (2026-10-04) "aeo checker" (pos 12.1, 76 impressions) and "best aeo checker" (pos 10.6, 60) rank on `/blog/best-aeo-tools-ai-search-visibility` with 0 clicks: added a direct "What is the best AEO checker?" answer, retitled for 2026, fixed "20+" to 25; homepage title/description now say "AEO checker". Re-check positions in the next GSC Overview.
  - [x] (2026-10-12) Published `/blog/aeo-checklist` (25 checks mirroring the scanner, tool links, FAQ) and linked it from /ai-seo-audit. Re-check its position in the next GSC Overview. Original note: "answer engine optimization checklist brand mentions ai search 2025" (pos 8.9, 54) landed on `/blog` (the index): there was no `aeo-checklist` post (a link to it on /ai-seo-audit was a live 404, fixed 2026-10-04 and now guarded by tests/blog-links.test.ts). Write a real "AEO checklist" post next weekend and link it from /blog and /ai-seo-audit.
  - [ ] GSC Overview 2026-10-04 (28 days to Oct 2): 1.9K impressions, 7 clicks, daily impressions rising from ~25-50 to ~90-105. Biggest pages: `/blog` index 870 impr at pos 55, `/blog/best-aeo-tools-...` 484 at pos 21, `/blog/aeo-for-saas` 334 at pos 56 ("aeo for saas"; REFRESHED 2026-10-04: removed unsupported claims about brand-mention tracking and results timelines, added SaaS schema, crawler and page steps with tool links; re-check position in a few weeks), `/blog/how-to-check-if-website-appears-in-chatgpt-recommendations` 57 at pos 22. Brand query "aeocheck" ranks 1. Sitemap was last submitted 2026-06-27 (27 URLs); the new tools and posts were never submitted, so on-publish resubmits it with the next blog push. Many long queries start with "%" or "+" (likely AI tools fanning out searches): keep answering checklist/visibility questions directly.
  - [ ] GSC Overview 2026-10-12 (28 days): ~2.1K impressions, 8 clicks, 91% desktop, 1.4K US. `/blog` index still 703 impr at pos 55 (checklist post now exists), `aeo-for-saas` 393 at 52, `best-aeo-tools` 452 at 21, homepage 38 impr pos 10 / 5 clicks for "aeo checker" (78 impr at pos 18.5). Tools earn the most impressions on `/tools/schema-checker` (101, pos 74), `/tools/sitemap-checker` (65, pos 74), `/tools/meta-tag-checker` (39, pos 49), but sit on page 5+: next steps are tool-page titles/H1s matching the queries ("json ld checker", "check my meta tags", "check sitemap"), internal links from relevant blog posts, and a FAQ block on each tool page. Re-check the new checklist post's position next week.
  - [x] (2026-10-12) Tool-page SEO pass for schema-checker, sitemap-checker, meta-tag-checker: query-matched titles and H1 ("JSON-LD checker", "Validate sitemap.xml", "title, description and OG tags"), a FAQ answering the exact query ("how do I check ...") on each, and contextual links from the technical AEO guide. Re-check positions in the GSC Overview in 2-3 weeks.
  - [x] (2026-10-12) `on-publish` diffed only the last commit, so a multi-commit push skipped IndexNow and the sitemap resubmit; now diffs the whole push and has a `workflow_dispatch` with a `slugs` input.
  - [ ] Read the GSC Overview for /tools impressions before deciding the next tool or blog hub; re-run weekly (the feedback workflow runs Tuesdays 05:00 UTC).

  - [ ] Re-verify the claims on all four `/vs/*` pages (prices, free trial, features) against each competitor's public pricing page, then bump the "last checked" month in `ComparisonPageClient.tsx`. Last full check: Profound 2026-10-04; others rely on the 2026-10-03 research notes
- Maintenance: dependency updates (minor/patch weekly, majors with care), `npm audit`, runtime errors.

---

## Owner actions (need dashboard/credential access Claude does not have)

- TRAFFIC (docs/GROWTH.md): post the study and tools on Show HN / Reddit / Product Hunt / directories using the drafts there, ask the authors of "best AEO tools" roundups for inclusion, request indexing in Search Console, consider Vercel Pro.

- DEPLOYMENT LIMIT (2026-10-04): Vercel rate limited deployments ("retry in 24 hours") after about
  100 deployments in a day on the Hobby plan, so `main` was ahead of production until the limit
  lifted. Claude now batches pushes and `vercel.json` turns off previews for `claude/*` branches.
  If weekend sessions keep hitting the limit, upgrade the Vercel plan (Pro has no daily cap) or
  tell Claude to push even less often.

- MONETIZATION (market research 2026-10-04): to earn without many paying users, sign up for the Semrush
  (BrandLinker/PartnerStack) and HubSpot affiliate programs and give Claude the tracking links via env vars;
  approve a privacy-policy update for an email digest; provide `PERPLEXITY_API_KEY`/`GEMINI_API_KEY`
  and a monthly budget for a free brand-mention check. Ads only once traffic justifies it.

- DECISION NEEDED (marketing claim accuracy): the homepage stats bar says "5,700+ scans run", while
  `/api/stats` reports 977, and that already includes a hard-coded +500 (`app/api/stats/route.ts`).
  If scans from before reports were persisted justify a higher number, record the real figure;
  otherwise Claude recommends showing the real count and removing the +500.

- OWNER DECIDED 2026-10-12 ("whatever you think is best"): follow the recommendation below (Pro 10 prompts weekly on 2 engines, Agency 50, Free 3-prompt sample). `GEMINI_API_KEY` and `PERPLEXITY_API_KEY` are now set in Vercel production (sensitive); `AI_VISIBILITY_ENABLED` was already set. Building: weekly runs and plan placement are the open Phase 4 items. Original note: AI Visibility Tracker placement. Claude recommends: Pro =
  10 prompts tracked weekly on 2 engines, Agency = 50 prompts, Free = one-off 3-prompt sample on
  the report as an upgrade hook. Cost ~ $1 per tracked brand per month (docs/RESEARCH.md).
  To try it now as admin: set `AI_VISIBILITY_ENABLED=true` plus `PERPLEXITY_API_KEY` and/or
  `GEMINI_API_KEY` in Vercel, then POST /api/ai-visibility.

- DONE 2026-10-12 (owner decided: "do whatever you think is best"): Free users may now monitor 1 URL (server gate removed on add/edit/delete; cap stays 1; manual "scan now" stays Pro, Free gets the weekly cron email). Was: the pricing page lists "1 monitored URL" for Free
  (`PLAN_LIMITS.free.monitorUrls`), but `/api/monitor` rejects all Free users ("Monitor requires a
  Pro plan"). Either let Free monitor 1 URL (server change) or remove it from the Free plan copy.
  Claude recommends allowing 1 monitored URL on Free: it matches what is advertised and drives retention.

- Rotate or delete the test accounts whose passwords were committed in `AUDIT.md` (still in git history)
- Set `CRON_SECRET`, `RESEND_API_KEY`, `INTERNAL_API_SECRET` in Vercel
- Run new migrations in `supabase/migrations/` against production (Supabase SQL editor), in order:
  `20261003_drop_public_compare_runs_policy.sql`, `20261003_atomic_scan_usage.sql`, `20261003_limit_email.sql`,
  `20261004_ai_visibility_runs.sql` (only needed once the AI tracker is enabled)
- RESOLVED 2026-10-04: Google Search Console automation works again (new service account, secrets `GSC_CLIENT_EMAIL` / `GSC_PRIVATE_KEY`, variable `GSC_SITE_URL`). The `GSC Feedback Loop` workflow had been auto-disabled for inactivity and was re-enabled; its first run succeeded. Run the manual `GSC Overview` workflow (sitemaps, top queries/pages, tool pages) whenever planning.
- Optional: AI cover images stopped working (Hugging Face no longer serves FLUX.1-schnell via the
  free `hf-inference` provider). Covers now fall back to branded images automatically. To get AI
  illustrations back, add Hugging Face inference credits (the script tries provider "auto" first).
- Export the production schema so Claude can write the base migration and use `webhook_events`:
  `npx supabase db dump --schema-only > supabase/schema.sql` (or Supabase dashboard > Database > Schema), then commit it
- In Lemon Squeezy, make sure the webhook subscribes to: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_payment_failed`

- [x] (2026-10-26) Content-map consistency: reconcile the legacy best-tools pillar with the canonical comparison guide so the site-wide content-link checker does not demand a link that redirects back to the same page. Preserve existing URLs and verify generator slots before changing the map.

- [x] (2026-10-25, A17 measurement) Extend the existing read-only GSC Overview with bounded targeted query/page retrieval, complete JSON labels, finalized Web/Pacific dates, explicit coverage and error status. Verify actual post-merge output before interpreting query/page evidence; do not commit raw analytics.
- [ ] Review targeted Overview pairs for the priority guides, then compare the first complete post-change window against matching filters/dates. Verify country/device segments before narrower ranking claims.

- [x] (2026-10-25, services S01/S03) Ship the scoped implementation page, service contact mode, canonical discovery, updated shared CTA and one report placement; keep scanner access, pricing and report rights intact.
- [~] (services S02) Validate and confirm service leads through the current private contact store with mocked receipt/error coverage and live schema metadata inspection. Real authorized production enquiry/readback, notification delivery and owner review acceptance remain unverified; do not send unsolicited tests.
- [~] Services S04 discovery is shipped; S05 app events are implemented but destination/consent/receipt acceptance and S06 qualified-enquiry/delivery review remain open. Do not infer conversions from a data-layer queue or GTM presence.

- [x] (2026-10-25, owner request, S04) Repair public mobile navigation and tablet breakpoint gap; add shared header/footer service links and contextual homepage/pricing CTAs. Add scoped USD service starting prices with proposal confirmation. Software plans remain unchanged. Verify browser artifacts and deployed output before live acceptance; S02/S05/S06 remain open.

- [x] (2026-10-26, A13) Validate bounded AI insight output before persistence; reject raw malformed response fallback while preserving deterministic scan completion and schema grounding. Provenance, prompt isolation and provider spend controls remain open.

- [x] (2026-10-26, A11/A13) Bound all AI prompt fields and final serialized size; frame page/context as untrusted JSON. Validate invalid configuration and encoded expansion with provider-skipping scan regression. Provider-role separation/live adversarial testing remain open.

- [x] (2026-10-26, A13) Reuse validated AI insights for exact prompt evidence within the bounded process-local cooldown; preserve per-scan persistence/usage and avoid stale/mutated cache values. Distributed budgets, provenance and live-provider acceptance remain open.

- [x] (2026-10-26, A17 crawl health) Apply existing private/account/API crawl exclusions to every named AI crawler group; verify public sitemap URLs remain allowed. Robots directives are not access control or proof of indexing.

- [x] (2026-10-26, owner-approved services revision) Repackage services as $499 Fixes Sprint, $1,499 Foundation and $999/month Ongoing Optimization with 4/12/8-hour allowances, clear Foundation recommendation and aligned enquiry labels. Preserve software rights and proposal-only intake; verify browser artifacts before merge.

Owner update 26 October: approved a deliverable-led service page inspired by Brickell Digital. Public packages describe outputs instead of hours: sprint up to 3 fixes; Foundation review and coordinated work on up to 3 existing pages; ongoing monthly plan up to 2 existing-page improvements. One review round, explicit proposal boundaries and custom scope for templates/integrations/new pages. Prices remain $499/$1,499/$999 monthly. Internal planning must validate effort before quoting. Page now explains buyer questions, retrieval/entity/content work, implementation evidence and measured discovery separately from observed AI citations. No new monitoring capability or outcome guarantee.

- [x] (2026-10-26, A13) Separate application instructions and untrusted evidence through native provider roles; verify all provider payloads in CI. Live adversarial acceptance remains open.

- [x] (2026-10-26, A13) Bound simultaneous scan AI generation chains per process; preserve cached results and local fallback under saturation. Distributed budgets remain open.

## Machine-readable discovery accuracy (26 October)

Corrected llms.txt to describe 25 deterministic readiness checks, optional generated recommendations and unavailable-aware lab performance rather than a real-user Core Web Vitals or observed AI inclusion assessment. Separate crawler categories, link canonical implementation services, exclude redirected blog slugs and clarify that the file does not control indexing/access. Regression compares listed blog URLs with canonical sitemap entries. No scoring, rights, prices or publication dates changed; this is descriptive/discovery hygiene, not proof that an AI system consumes the file or cites the site. Full audit and organic/conversion measurement remain open.

- [x] (2026-10-26, A13 partial) Store server-controlled recommendation provider/requested-model/reported-model/time metadata with validated insights; retain original time on reuse. Report display and live-provider acceptance remain open.


## Recommendation source display (27 October)

Screen and printable reports now distinguish generated guidance with rule-based checks, local rule-based guidance when insights are absent, and saved/illustrative analyses with unknown provenance. Show original UTC generation time, requested versus provider-reported model and explicit model-verification limits; never substitute scan time or infer old providers. The note clarifies that readiness interpretation is not an observed AI answer/citation. Shared preview redaction and scores remain unchanged. Regression and isolated browser checks cover all three states at desktop/mobile widths and printed output. A13 live-provider acceptance, distributed budgets and the full audit remain unfinished; production enquiry/email/analytics acceptance and post-release growth attribution are still open.


## Checkout provider response boundary (27 October)

Bound hosted-checkout response bodies to 64 KiB and keep a 15-second provider deadline active through body consumption; propagate caller cancellation and cancel rejected bodies. Reject malformed envelopes and validate checkout destinations on both server and client as bounded HTTPS URLs on the exact lemonsqueezy.com host or its subdomains, without credentials or nondefault ports. The old suffix-only check accepted lookalike domains. Preserve signed path/query text, existing account/variant/return payloads, prices and rights. Disable provider redirects and remove raw provider-body/error logging. No automatic retry, real checkout, payment or activation acceptance is claimed. Regression coverage includes stalled headers/body, cancellation, unsafe destinations, malformed/oversized output and redacted errors. A11/A12 remain partial: activation/return recovery and live payment acceptance are still open. Growth assessment: available GSC evidence remains pre-release; existing discovery fixes do not justify repeated titles or guides without new evidence.


## Application funnel signals (27 October)

Read-only inspection of the published GTM resource found a GA4 destination and click-text tags, but no rules for scan completion or confirmed saved-service leads. Added bounded, allowlisted data-layer events for scanner dispatch/completion and shared service CTA/form-start/save outcomes. No URLs, report tokens, identity, messages or raw context are included; no new storage/vendor/direct analytics transport. Saved events follow literal successful storage responses, with component-lifetime guards; failed scans do not emit completion. Existing scanner/report rights and form behavior remain. See [FUNNEL-MEASUREMENT.md](FUNNEL-MEASUREMENT.md) for the exact contract and remaining GTM consent/routing/GA4-receipt acceptance. Published configuration is not proof of receipt or conversion counts; GTM editing/GA4 reporting tools are unavailable. S05/A15 instrumentation is partial, with destination acceptance blocked; S02/S06 and the full audit remain open. Available GSC data still predates releases; no title/content rewrite or ranking/AI-inclusion gain is claimed.
