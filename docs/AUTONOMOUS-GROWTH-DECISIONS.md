# Autonomous growth decisions — AEOCheck

Status: implementation policy proposed, not an enabled autonomous publishing system.
Updated: 2026-11-16

## Purpose
Prioritize product features, tool-page improvements, content refreshes and new posts with evidence from Google Search Console (GSC), product funnel analytics, user issues, and verifiable competitor research. A readiness scan is not evidence of actual AI citations. Never claim results that were not measured.

## Current system (verified from repository)
- `.github/workflows/gsc-overview.yml` runs a read-only GSC overview on manual dispatch; `scripts/gsc-overview.mjs` fetches finalized GSC data.
- `.github/workflows/content-draft.yml` generates two draft PRs per week from `content/topical-map.json`; it does **not** currently prioritize from fresh GSC metrics.
- `.github/workflows/blog-generate.yml` manually generates a blog and pushes it directly; it bypasses the review PR gate.
- `.github/workflows/gsc-feedback.yml` is explicitly retired to prevent private GSC information being committed or published.
- `.github/workflows/ci.yml` runs typecheck, lint, links, tests, build, and some browser checks.
- `CLAUDE.md` documents a separate weekend cloud-session autonomy routine. Do not assume its scheduler or credentials actually run without checking logs.
- `content/topical-map.json` already contains published posts such as `aeo-vs-seo`; duplicate content prevention is mandatory.

## Evidence and privacy contract
1. Obtain **fresh finalized** GSC rows (28 days vs prior 28 days; optionally 90 days to reduce noise), query+page pairs, impressions, clicks, CTR, position, date and page.
2. Keep the raw GSC dataset **private** (encrypted or short-lived CI artifact accessible only to trusted jobs). Never commit raw queries, account details, credentials, or query/page rows to a public repository or public issue. Store only aggregates that cannot leak private query strings if any summary is committed.
3. State the snapshot date and exact window; GSC lags and anonymizes some queries. Do not interpret sampled/filtered rows as property totals.
4. Search Console is a *site performance* source, not an absolute keyword search-volume tool or AI citation tracker. External market sizing needs an actual licensed keyword tool; label estimates and unknowns. Do not fabricate volumes, difficulty scores, or traffic gains.
5. For competitor claims, cite dated primary pages and independently verify feature and pricing claims. Borrow topic ideas, not copy or closely paraphrase competitor text.
6. Prefer original product observations, real audits (anonymized with consent), and useful worked examples for content.

## Decision queue: deterministic baseline
Each candidate records: type, title, mapped existing URL or proposed URL, keyword cluster, canonical target, evidence window, primary source, GSC impressions/clicks/CTR/position, research links, estimated implementation effort, dependencies, release risk, and chosen action.

Actions in order:
A. **Fix high-impact breakage first**: production errors, indexing regressions, broken routes, security findings, and critical funnel bugs.
B. **Improve pages already getting impressions**: if a relevant page has material impressions but weak CTR, inspect the snippet and query intent; if position is ~8–20, improve content/relevance/internal links before creating a competing page. Check device/country and sample sizes.
C. **Strengthen existing utility tools**: GSC evidence for schema, meta, sitemap, robots and related query families can justify feature improvements, documentation and internal links.
D. **Publish content only for uncovered intent**: create a new page only if the query intent differs from an existing page and cited evidence exists. Otherwise refresh/consolidate existing pages.
E. **New tools**: require repeated first-party demand or verified external market demand, a clear differentiated workflow, a conversion path, an estimate of ongoing API cost, a test plan, and safe data handling.

Suggested *ranking heuristic* for candidates, explicitly an internal decision score (NOT Google keyword difficulty or search volume):
- 30% observed demand (normalized impressions trend + distinct relevant query/page pairs);
- 25% demonstrated opportunity (weak CTR vs comparable owned pages, ranks near page one, missing intent);
- 20% product/business impact (verified signups, scans, activated users, or paid conversions by entry page where instrumented);
- 15% implementation confidence (tests available, limited dependencies, feasible API cost);
- 10% strategic fit (owned topic cluster and differentiation).
Do not score missing business conversion metrics as zero; mark unknown and reweight disclosed available criteria. Prefer readable raw evidence and reasons to a precise-looking composite score. Do not promote a one-day spike into a trend.

## Content gates
- Before draft: scan `content/blog/`, `content/topical-map.json`, published site routes, and canonical mappings for same or overlapping search intent.
- Preserve a single canonical landing page per intent; update an existing `aeo-vs-seo` post instead of creating it again.
- Every blog must satisfy source-backed accuracy, unique value, helpfulness, internal-link lint, non-promissory AEO claims, article metadata, relevant hero/OG image with alt, and preview-page rendering.
- Start with no more than 2 evidence-backed articles weekly (as already scheduled); increase only when quality controls and actual traffic/conversions show benefit. There is no SEO benefit guaranteed from a daily publication count.
- Send no automated indexing notification until a healthy deployed URL is verified; sitemap submission is not instant indexing.

## Auto-release policy
**Low risk auto-release permitted only after checks pass:** fact-checked new content, corrected metadata, nonbreaking internal links, and small isolated tool improvements with adequate automated tests.
**Require owner review:** pricing, payments, auth, legal/privacy, user data changes, destructive migrations, third-party API spending changes, plan entitlements, sensitive security controls, or large architecture changes.
- Agent prepares a scoped PR with citations/evidence, expected outcome, tests and rollback path.
- Require passing typecheck, lint, unit tests, build, link lint, relevant Playwright tests, and **preview deployment** validation; no bypass for generated content.
- Use protected main / required checks. Merge automatically only if change classification is low-risk and policy check passes. No direct-content push to main from generator.
- Vercel production deploy only from protected main or staged tested production artifacts. Confirm deployment status, route responses, and behavior before IndexNow/sitemap notification.
- Monitor production error rate and crucial conversions; roll back failed deployments and stop further automatic releases until investigated. Backups and quota/cost ceilings are prerequisites to unattended release.
- Do not expose secrets in logs, artifacts, diffs or generated posts.

## Required implementation tasks (not yet completed)
1. Add a read-only GSC metrics collector with a **private** handoff to an opportunity planner, comparing equal-length periods with dates and explicit evidence quality.
2. Build URL/query clustering and deduplication against existing content and topical map; produce ranked proposals with reproducible reasons.
3. Change `content-draft.yml` to select from that queue instead of its first static slot, while retaining PR creation.
4. Change `blog-generate.yml` to open a PR rather than push directly to main; add mandatory content/fact checks and OG image validation.
5. Add page-level scan/signup/paid-conversion attribution where allowed and privacy-safe, so the research loop optimizes for real outcomes rather than impressions alone.
6. Define low-risk change classifier, required GitHub branch protections, preview tests, cost budgets, kill switch, deploy verification and rollback alarms; test on a nonproduction branch before activating auto-merge.
7. Instrument daily health snapshots and a weekly private digest with decisions, evidence windows, releases, failures and measurable outcomes.
8. Confirm that the existing weekend autonomous session scheduler actually runs; consolidate schedulers to prevent overlapping agents and unexpected Vercel deployment use.

## First baseline priority
The 2026-10-12 research note reported about 2.1K GSC impressions and 8 clicks in the prior 28 days; utility query families outperformed AEO jargon. **Historical only**: retrieve a fresh private 28-day and preceding 28-day snapshot before changing priorities or publishing. Investigate schema/JSON-LD, sitemap and meta tools first if current GSC evidence still supports them.
