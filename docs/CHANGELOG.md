# 2026-10-25 - Repair mobile navigation and publish scoped service pricing

Public navigation no longer disappears with missing auth configuration. Aligned mobile/desktop breakpoints, added keyboard/Escape/outside dismissal and viewport scrolling, and removed closed links from keyboard navigation. Added implementation-services discovery in shared navigation/footer and one CTA each on home and software pricing. Published owner-requested USD starting rates: $499 fixes sprint, $999 key-page improvements and $499/month ongoing, with explicit allowances, exclusions and proposal confirmation. No software price/entitlement, checkout, auth-method or database change. Regression/type/lint/build and isolated browser checks gate release; inspect desktop/mobile screenshots before merging. Real production enquiry/email delivery and analytics attribution remain unverified.

# 2026-10-25 - Launch scoped AEO/GEO implementation enquiries

CI now runs isolated Chromium service/contact/report journeys and retains synthetic screenshots for seven days. External browser requests are blocked; valid submissions are intercepted, so no customer record or email is created. Desktop/mobile screenshots at 1280/390 px must be inspected before merge. Local production HTTP smoke checks return 200 for the new page, both sitemaps and existing image endpoints, with 400 for empty contact input. PR #43's reviewed live query/page output is verified; stale targeted-retrieval blockers are corrected without publishing private metrics.

Added the dedicated implementation-services page, clear engagement scopes, process/FAQ and enquiry form. Existing blog/tool service CTAs and one completed-report CTA lead to the same canonical page, now listed in XML/HTML sitemaps. Service enquiries reuse private contact-message storage with bounded validation and a matching save receipt before success. No prices, software entitlements, private report exposure, database migration or production test email. Validation covers API/storage failures with mocks, general-contact/report-access regression, type/lint/build/CI and desktop/mobile browser review. Removed unsupported metadata exports from two existing image route handlers, preserving their GET responses and dimensions, so route type validation also passes with webpack. Real production saved-lead/readback, notification delivery, analytics attribution and broader placements remain open; full audit completion is not claimed.

# 2026-10-25 - Retrieve targeted Search Console query/page evidence

Extended read-only GSC Overview with actual query/page pairs for checker intent, priority guides and long-query candidates. Fixed the shared Pacific-date window, finalized Web scope, bounded pagination, label precision and failure reporting. Overview uses read-only OAuth; sitemap submission keeps its existing scope. The existing workflow refreshes on diagnostic changes to main as well as manual runs, with no new recurring schedule, metric commits or notifications. Mocked regression tests, type/lint checks, production build and CI gate the release; inspect real post-merge output before claiming evidence coverage. No customer-facing content, price, entitlement or database change. Raw analytics stay out of this repository.

# 2026-10-25 - Apply long-query discovery to the SaaS guide

Refreshed the existing SaaS guide with direct buyer-question answers, page selection, actionable checks and a repeatable measurement workflow. Corrected crawler-purpose and readiness-versus-observed-visibility claims using primary sources. Preserved the June publication date and existing title; recorded the actual update date. Private export analysis informed intent selection but does not establish joint query/page attribution or post-release gains. No private metrics, new pages, prices or entitlement changes. Validation uses existing regression/link checks, type checking, lint, production build and CI; live verification follows merge.

# 2026-10-25 - Research implementation-services presentation

Added a sourced service-page and conversion-path plan based on Brickell Digital, Screaming Frog, HubSpot and Google guidance, plus inspection of existing AEOCheck CTAs/intake. Prioritized scoped service delivery under A17/A15 with S01-S06 acceptance steps. Research complete; service page/funnel still pending. Documentation only: no prices, software limits, database or public product behavior changes. Validation: documentation checks and CI regression/type/lint/build gate.

# 2026-10-25 - Prioritize non-branded search acquisition

- Prioritize the existing comparison guide and scanner conversion path alongside the implementation audit, followed by SaaS and ChatGPT measurement content.
- Record targeted query/page evidence and matching-window measurement requirements; separate branded and non-branded results.
- Correct the stale GSC access blocker after successful read-only retrieval. No private analytics or application behavior changes.

# 2026-10-25 - Save one-time reports and consume rights together

Full one-time-plan scans now save the report and consume the profile's URL/counter in one transaction after rechecking current rights. Failed writes roll back both sides; the unchecked pre-save profile PATCH is removed. The additive migration is applied and checked without customer mutations. Current scan allowances and other report paths are preserved. Validation: 638 tests, type checking, lint (0 errors, 18 existing warnings), production build and local rejection checks. Purchase-scoped reservations, free-plan retest counters, retry recovery and signed-in/multi-connection acceptance remain open. The owner also made SEO/AEO/GEO an ongoing parallel priority in the standing work and repository plan.

# 2026-10-25 - Enforce audit creation windows atomically

Audit creation now rechecks the existing monthly/rolling caps and inserts under an account transaction lock after discovery. Early count guards still avoid work when a cap is already exhausted. Tier limits and uncapped behavior are preserved; missing/unavailable RPCs have no direct-insert fallback. The applied and verified migration reconciles the existing discovery-count field for historical installs while preserving the live column. Validation: 605 tests, type checking, lint (0 errors, 18 existing warnings), production build and local access-control checks. Discovery reservations, durable jobs, recovery and signed-in/multi-connection acceptance remain open. SEO measurement-access limitations are recorded without claiming ranking gains.

# 2026-10-25 - Enforce monitor creation caps in one transaction

Monitor creation now serializes the current account cap check and insert with an advisory transaction lock, preventing separate requests from independently accepting the same remaining slot. Existing plan caps, weekly creation and duplicate responses are preserved. The additive migration is applied and verified without customer-monitor changes. The RPC client bounds and validates responses and has no separate count/direct-insert fallback. Validation: 566 tests, type checking, lint (0 errors, 18 existing warnings), production build and local access-control checks. Signed-in production creation and true multi-connection contention remain unverified; durable monitoring jobs, recovery and email delivery remain open.

# 2026-10-25 - Commit audit page results and progress atomically

Audit-page saves now lock the owned audit and append to current results, preventing stale requests from overwriting another page's saved result. Target, duplicate and finished-state checks run again inside the transaction. Progress, aggregate and completion commit together; zero scores count and failed-page-only averages remain unavailable. RPC failures have no legacy replacement-write fallback. The additive migration is applied and verified without customer-audit writes. Validation: 538 tests, type checking, lint (0 errors, 18 existing warnings), production build and local access-control checks. Durable jobs, leases, recovery and signed-in/multi-connection acceptance remain open.

# 2026-10-25 - Stop disconnected manual monitor and audit-page scans

Manual monitor scans now propagate cancellation and enforce a total scan deadline. Audit disconnects stop before result/progress writes, while active-caller timeouts keep existing error reporting. Owner reads are bounded through body consumption; database error payloads are excluded from audit logs. Already dispatched writes settle independently, with ambiguous failures retained as failures. Validation: 497 tests, type checking, lint (0 errors, 18 existing warnings), production build and local access-control smoke checks. Durable jobs, concurrent audit updates and signed-in production acceptance remain open.

# 2026-10-25 - Commit billing mutations and replay receipts together

Whitelisted billing profile updates now commit in one transaction with exact-body processed receipts. Duplicate deliveries cannot overwrite a later profile state, and conflicting reads or failed/suppressed writes stay retryable. Existing plan/refund decisions are preserved. Webhook bodies are bounded to 256 KiB with stricter signature/root validation. The additive service-only invoker function is applied and checked without production customer mutations. Validation: 479 tests, type checking, lint (0 errors, 18 existing warnings), clean build and local production rejection checks. Distinct-event ordering, durable inbox/recovery, repurchase grants and live payment sandbox acceptance remain unfinished.

# 2026-10-25 - Commit monitor snapshots and schedules atomically

Manual and scheduled scans now persist their snapshot and last-scanned timestamp in one database transaction. Failed or silently suppressed writes roll back; manual saves return 503 and cron skips email after persistence failure. The shared client bounds RPC responses and validates the saved observation without a split-write fallback. The additive service-only invoker function is applied and verified in production. Validation: 457 tests, type checking, lint (0 errors, 18 existing warnings), production build and local smoke checks. Leases, idempotent recovery and durable email delivery remain open; no actual email or customer-row change was used for verification.

# 2026-10-25 - Version monitor observations and guard comparisons

New manual/scheduled monitor snapshots record their producing scoring method. List deltas and email score/category alerts require matching recorded methods. History retains all observations but connects only compatible adjacent points, avoiding misleading trends across method changes or unknown legacy methods. The nullable additive migration is applied and checked in production; existing scores/data/access remain intact and old writers stay compatible. No actual emails or live cron were triggered for verification. Validation: 439 tests, type checking, lint (0 errors, 18 existing warnings) and clean production build. Signed-in history and visual acceptance remain unverified. Durable monitor jobs, atomic snapshot/schedule writes and the email outbox remain open.

# 2026-10-25 - Compare report history only within a recorded scoring method

Report history no longer labels different or unknown scoring methods as improvement/regression. Matching recorded versions retain score and check deltas; incompatible history preserves the earlier score/date with a new-baseline explanation. Dashboard delta badges follow the same compatibility boundary. Stored scores, category snapshots and access rules are unchanged. Validation: 419 tests, type checking, lint (0 errors, 18 existing warnings), production build and local production smoke checks. Browser fixture screenshots and authenticated production history acceptance remain unverified. Monitor snapshot versions and email/history comparison guards remain open.

# 2026-10-25 - Bound remaining application JSON requests

Checkout, contact, welcome email, monitor frequency updates and audit-page scans now reject malformed/non-object JSON with 400 and payloads above 32 KiB with 413, cancelling oversized streams before downstream work. Contact/welcome field types are checked before trimming. Authentication, ownership filters, checkout selection and valid submission behavior are covered by mocked regressions. No actual messages, checkouts or customer writes are used for verification. Validation: 394 tests, type checking, lint (0 errors, 18 existing warnings) and production build. Signed webhook bounds and remaining cancellation/budget work remain open under A11.

# 2026-10-25 - Start the seven-day SEO sprint

Refreshed the existing best-AEO-checker guide with an evidence-based chooser, clearer scan/tracking distinctions and accurate product claims. Added optional substantive article-update dates across visible metadata, Open Graph, JSON-LD and XML sitemap output while preserving publication dates. Removed build-time lastmod values from unchanged static pages and shared all 14 public tool discovery links between HTML/XML sitemaps. The seven-day plan uses the owner's Search Console export without publishing raw metrics. Ranking gains remain an objective requiring measurement.

# 2026-10-25 - Bind inherited retest unlocks to the scanned URL

A retest source report can grant its existing unlock only when its stored URL normalizes to the requested scan URL. Different hosts, pages, queries or schemes stay preview reports; missing/malformed source URLs grant no inherited unlock. Same-URL behavior and ownership filtering are preserved. Eight streamed scan/save regression cases cover the boundary. Purchase/retest atomicity remains separate work.

# 2026-10-25 - Cancel disconnected scans and bound recommendation responses

Disconnected scan streams now abort core, AI and competitor work before persistence and release unused quota once. Competitor timeouts abort the underlying scan. Saves already started finish and settle usage. Recommendation provider bodies are capped at 1 MB, deadlines cover body reads, caller cancellation prevents fallback calls, and provider error payloads are excluded from logs. Validation includes 323 tests covering stream/request cancellation, late saves and bounded/stalled provider bodies. No scoring, price or entitlement changes.

# 2026-10-25 - Require atomic quota reservations

Production quota functions are verified. Missing RPCs now return unavailable instead of falling back to non-atomic read/write accounting, and commits reject unaccepted reservations. SQL regression tests cover caps, releases, account/month isolation and browser privilege denial. The PR #25 permission migration was applied after explicit owner approval; private Data API reads are denied while public statistics, waitlist inserts and server report reads retain their intended access. Rolled-back production checks left no test rows. The migration filename matches recorded Supabase history. Full signed-in and multi-connection acceptance remain open.

# 2026-10-25 - Tested database permission boundary

Supabase is connected. Added six synthetic Postgres tests and a migration that explicitly limits browser table access to waitlist INSERT and public statistics SELECT while preserving server-role grants. Production application is pending approval after automatic review rejected the live permission changes; no database fix is claimed live. Production metadata and customer records are excluded. Full schema baseline and transaction work remain open.

# 2026-10-24 - Scoring provenance and report snapshots

New reports, competitor/comparison results and successful audit-page JSON carry a scoring-method version, policy credits/caps and fetch/measurement provenance. Versioned report/print category presentation uses stored snapshots instead of silently recalculating them under a later method. Existing unversioned reports retain their current behavior. The methodology document records today's formulas and known limitations. Numerical scores, check weights and customer plans are unchanged. Validation: 300 tests, type check, lint and production build; independent before/after comparisons matched on 1,000 weighted-status vectors and two freshly captured public HTML pages. No migration or historical backfill; monitor snapshot versions and cross-version comparison presentation remain open.

# 2026-10-24 - Audit and monitor count verification

Audit and monitor creation fail with 503 when a database count fails or is missing/malformed, before discovery or insertion. Bounded object JSON prevents malformed or oversized inputs from reaching count queries. Verified zero counts still permit creation and exhausted limits still return their existing limit responses. Count response bodies are cancelled. Validation: 292 tests across 46 files. Count-then-insert concurrency remains open pending verified database transactions; no entitlement or migration changes.

# 2026-10-24 - Visibility evidence integrity

The admin visibility prototype preserves Gemini source URIs, excludes unresolved source redirects from citation rates and reports all-engine failures as unavailable. New JSON results retain answer text, requested model, observation time, prompt kind and methodology version. The existing UI labels distinguish list position from search rank; interactive answer inspection remains deferred until browser QA is available. Legacy citation data is labeled unverified. Provider downloads and admin request bodies are bounded. Validation: 275 tests across 45 files; live paid-provider and authenticated production journey verification remain open. No migration, customer plan-placement or entitlement changes.

# 2026-10-24 - Tool and discovery resource boundaries

All seven free tools now reject malformed JSON roots and oversized requests before quota or network work. Robots/sitemap tool responses and discovery pages are bounded while streaming; discovery timeouts cover body consumption and rejected responses are cancelled. Comparison failures abort the other scan before releasing the reservation. Validation: 270 tests across 44 files. No migrations or entitlement changes. The owner has approved Supabase access; actual tool exposure remains unresolved in this conversation.

# 2026-10-24 - Quota storage failure guards

Configured quota storage errors now return service unavailable before starting scans or tools. Only a missing RPC permits the temporary compatibility path; failed compatibility reads and writes no longer silently succeed. Admin health reports capability configuration rather than requiring every optional provider key. Added the full audit acceptance checklist and recorded the owner's hourly continuation request. This does not establish verified production database schema or complete the full plan.

# 2026-10-24 - Scanner fetch integrity

Resolved page URLs now determine scanner origin/path checks; streamed response and request bodies are bounded; cancellation reaches scanner fetches; llms.txt HTML errors are rejected. Performance is labeled as Lighthouse lab data, with a TBT field and compatibility for old reports. These corrections can lower a new scan score if a soft error was previously counted as valid llms.txt or the actual destination blocks crawling. Stored historical overall scores are unchanged. See IMPLEMENTATION-STATUS.md for remaining database work.

# Changelog

Browser verification for the initial implementation-services release now runs in CI against the built local app, blocks external browser requests, uses synthetic report fixtures and intercepts valid contact submissions. Screenshots are retained for seven days; no production credentials or test email. Visual acceptance remains pending until the artifact is inspected.

Newest first. Every autonomous session adds an entry: date, what shipped, how it was verified, follow-ups.

## 2026-10-14 (session 71)

- SEO: new `/tools/faq-schema-validator` (FAQ-specific title, H1 and FAQ, reusing the schema checker). Added to /tools, footer, sitemap, llms.txt and linked from `aeo-checklist`.
- Verified live after deploy: robots tester returns a correct result for a real site (GPTBot blocked on nytimes.com, own group, Disallow /), Open Graph page serves 200 with the new title and H1; `/`, `/pricing`, `/blog`, `/api/stats` 200.

## 2026-10-14 (session 70)

- SEO: new `/tools/open-graph-checker` (query-matched title, H1, five-question FAQ; reuses the meta tag checker component and API, so same quota and SSRF protection). Added to /tools, footer, sitemap, llms.txt and linked from `aeo-checklist`.
- Verified: tsc, 211 tests, link-lint, build, local render of title and H1 (200).

## 2026-10-12 (session 69)

- Owner decisions executed: Free plan now allows 1 monitored URL (removed the Pro gate on `/api/monitor` POST and `/api/monitor/[id]`; the cap of 1 and the UI upgrade prompt were already in place), matching the pricing copy. Gemini and Perplexity keys added to Vercel production as sensitive variables via the Vercel API (never written to the repo); Gemini key verified with a models call, Perplexity key could not be tested from the session (egress blocked).
- Verified: tsc, tests, eslint on the changed routes.

## 2026-10-12 (session 68)

- New free tool `/tools/robots-txt-tester`: test a URL against any crawler's robots.txt (own group vs `*`, longest match, Allow wins ties, `*` and `$`), shows the deciding rule. `testRobotsAccess` in `lib/robots.ts` with 6 tests; API `/api/tools/robots-tester` (SSRF-safe fetch, 30 per month per client/IP). Added to /tools, footer, sitemap, llms.txt and linked from `robots-txt-ai-crawlers`.
- Verified: tsc, 211 tests, link-lint, build, SSRF rejection of a private URL, UI screenshots at 1280 and 390 px with a mocked API response. A live fetch could not be tested because outbound network from the session was down.

## 2026-10-12 (session 67)

- Owner request: scale for revenue. Wrote the keyword and revenue plan (docs/RESEARCH.md) and concrete ROADMAP items. Honest limit: there is no keyword-volume tool here, so priorities come from Search Console and public competitor pricing.

## 2026-10-12 (session 66)

- Owner request: organic lead capture. Added `ServiceCta` ("Need help optimizing for AEO, GEO and SEO?" with a Talk to us button) to blog posts, the 10 tool pages and /ai-seo-audit; contact form and API accept a new "Optimization services" subject, preselected by `/contact?subject=services`. No DB change (`contact_messages.subject` has no constraint).
- Verified: tsc, 205 tests, build, screenshots at 1280 and 390 px, form preselect on both widths.

## 2026-10-12 (session 65)

- SEO: rewrote titles and H1/FAQ on `/tools/schema-checker`, `/tools/sitemap-checker`, `/tools/meta-tag-checker` to match the queries Search Console shows (positions 49-74), and linked the meta tag and sitemap checkers from `technical-aeo-guide`. No tool behavior changed.
- Verified: tsc, 205 tests, link-lint, build, local render of all three titles and H1s.

## 2026-10-12 (session 64)

- Search Console: confirmed the connection works (GSC Overview workflow ran green and returned data; numbers recorded in the ROADMAP). Fixed `on-publish.yml`: it compared only `HEAD~1..HEAD`, so a push with several commits skipped the IndexNow ping and the GSC sitemap resubmit; it now diffs the full push and can be run by hand with a `slugs` input. Used it to notify search engines about `aeo-checklist`.

## 2026-10-12 (session 63)

- Owner granted Supabase access (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` in the cloud environment). Production was missing four migrations; applied them in one transaction via the Management API (`POST https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query` with `{"query": ...}`): `20261003_drop_public_compare_runs_policy` (closed a live leak: the `USING (true)` read policy let anyone with the public anon key list all compare runs), `20261003_atomic_scan_usage`, `20261003_limit_email`, `20261004_ai_visibility_runs`.
- Verified read-only afterwards: both usage functions exist, `compare_runs` keeps only its insert policy, `profiles.limit_email_month` and `ai_visibility_runs` exist. Counter test on a throwaway key at limit 1 returned 1 then -1; test row deleted.
- Follow-ups: `webhook_events` has only `event_id` and `processed_at`, enough to build idempotency; Vercel and Lemon Squeezy access not set yet.

## 2026-10-12 (session 62)

- Refactor: `ReportSectionNew.tsx` 1,373 -> 1,077 lines. Types and pure helpers moved verbatim to `lib/report-view-model.ts`; `MetaRow` and `PriorityColumn` to `app/components/ReportParts.tsx`. No markup or behavior change.
- Owner instruction: ship tested updates straight to `main` without asking.
- Verified: tsc, 205 tests, build, CI green on the PR. No screenshots (code moved unchanged).
- Blog: published `aeo-checklist` (GSC-driven: checklist queries had no matching post), with cover, linked from /ai-seo-audit; topical map marked published.
- Follow-ups: remaining split of the report's JSX sections, `HomePageClient.tsx`, `DashboardClient.tsx`.

## 2026-10-05 (session 61)

- Owner decision: accept CrowdReply's link-exchange request (email thread "wdyt?"). Added CrowdReply as entry 2 in `best-aeo-tools-ai-search-visibility` (later entries renumbered 3-10, comparison table row added). Written from what CrowdReply's own site says (AI visibility tracking across ChatGPT, Perplexity, Gemini and Claude; community engagement feature; backlinks marketplace), attributed to the vendor, with its limits (off-site only, performance figures unverified, follow platform rules and disclose affiliation). Because the placement is part of a reciprocal arrangement, the entry carries a disclosure line and the link is `rel="sponsored noopener"`; remove that only if the owner decides otherwise (Google treats exchanged links without it as a link scheme risk).
- Returned: reply to Timo (CrowdReply) is a Gmail draft awaiting the owner's send; the Pixelied backlink (they pick or we ask for a topical article) is theirs to place.
- Verified: build and local render show the anchor with rel="sponsored noopener".

## 2026-10-05 (session 60)

- Owner request: the automatic cover-image workflow did not work, so it is gone. Deleted `.github/workflows/backfill-images.yml` and `scripts/backfill-images.mjs`, removed the cover step from `on-publish.yml` (which now only needs read permission) and from `content-draft.yml`. Covers are now made by hand with the new `scripts/make-cover.mjs` (branded 1200x630 PNG in the same style as the existing covers; documented in CLAUDE.md).
- Generated and set the cover for `how-to-get-cited-by-chatgpt`.
- Note: `generate-blog.mjs` still has its own optional Hugging Face image step (needs `HF_TOKEN`); unused, left as is.

## 2026-10-05 (session 59)

- Blog: published the ChatGPT pillar hub `how-to-get-cited-by-chatgpt` (six steps, each linking a deeper guide or free tool; FAQ in frontmatter and body; no statistics). Claims are limited to OpenAI's documented crawler roles (OAI-SearchBot for ChatGPT search, GPTBot for training, ChatGPT-User for user-triggered fetches) and the utm_source=chatgpt.com referral parameter. `coverImage` left empty so the on-publish workflow generates the cover.
- Removed its temporary redirect in `next.config.ts`, marked it published in `content/topical-map.json`, and linked it from `how-to-check-if-website-appears-in-chatgpt-recommendations`. link-lint now passes with 0 errors (it had one since the redirect days).
- Verified: tsc, 205 tests, build, local render at 1280 and 390 px.
- Still open: `measure-ai-search-traffic` hub (temporary redirect remains), a real AEO checklist post.

## 2026-10-04 (session 58)

- Production bug fixed: `/ai-seo-audit` linked to `/blog/aeo-checklist`, which does not exist (404). Now points to an existing post. New guard `tests/blog-links.test.ts` fails when any `/blog/<slug>` string in `app/` or `lib/` has no post, redirect or route (verified it fails on a bad slug).
- Deploy status: the badge deploy (session 57) succeeded; production checks all 200, `/api/account` 401, live badge returns a scored SVG.
- Internal links from two existing posts (`robots-txt-ai-crawlers`, `technical-aeo-guide`) to the AI readiness study and badge, with numbers copied from the study data (7 of 72 block an AI search crawler, 13 of 72 block GPTBot, 36 of 85 publish llms.txt, 32 of 49 SaaS, 0 of 21 media, 40 of 62 Organization schema).
- Known: link-lint still reports the pre-existing missing pillar hub `how-to-get-cited-by-chatgpt` (hub planned for next weekend).

## 2026-10-04 (session 57)

- GROWTH plan item: embeddable "AI readiness" badge. `GET /api/badge?domain=` returns an SVG (score from `runScanCore` without PageSpeed or AI, so it can differ slightly from a full report); `/tools/ai-readiness-badge` creates HTML and Markdown snippets that link to `/ai-seo-audit?ref=badge` (each embed is a backlink). Cost controls: strict hostname validation (no IPs, ports or paths), `assertPublicUrl` through `runScanCore`, CDN caching (s-maxage one day, stale-while-revalidate a week) so only a cache miss scans, and a global cap of 3000 badge scans per month after which the badge shows "n/a". Errors return a short-cached "n/a" badge, never an HTTP error, so embeds do not break.
- In the tools index, footer, sitemap and llms.txt.
- Verified locally: stripe.com and notion.so return scored SVGs with cache headers, invalid domains return n/a; tests (204), tsc, eslint, build; screenshots at 1280 and 390 px.
- Follow-up: watch `badge:global` usage (usage table) after launch; lower the cap or add per-domain limits if abused.

## 2026-10-04 (session 56)

- Traffic plan (`docs/GROWTH.md`): diagnosis (distribution, not product), ranked levers, engineering items, owner actions with ready drafts.
- New original-data page `/research/ai-readiness-study`: robots.txt, llms.txt and homepage-schema signals on 85 hand-picked well-known sites (collected 2026-10-04 with `scripts/ai-readiness-study.mjs`, results in `data/ai-readiness-study.json`). Headlines are computed from the data at build time: 42% publish llms.txt (65% of SaaS, 0 of 21 media), 18% of readable robots.txt files block GPTBot, 10% block an AI search crawler. Page states the limits (hand-picked sample, unreadable sites excluded per metric, no claim that llms.txt helps). github.com was removed from the list because the sandbox proxy intercepts it. Dataset + FAQ JSON-LD, sitemap and llms.txt entries. It is a research page, not a blog post, so the 2-posts-per-weekend cap is untouched.
- Verified: tsc, 201 tests (data consistency tests), build, screenshots at 1280 and 390 px.
- DEPLOY STATUS: Vercel rate limited after the previous push; this ships with the next deploy (retry scheduled).

## 2026-10-04 (session 55)

- Fix Pack: "Download all (.zip)" bundles every generated file. Uses a small store-only ZIP writer (`lib/zip.ts`, no dependency); tests check the standard CRC-32 vector and that `unzip -t` accepts the archive and reads files back. Article/FAQ schema prefill was deliberately not added: it would need an author and publish date the scan cannot know, and placeholder values pasted unreviewed would be wrong markup.
- Verified: tsc, 198 tests, eslint, build.

## 2026-10-04 (session 54)

- New report feature "Fix Pack" (`lib/fix-pack.ts`, `FixPackSection`): ready-to-paste files generated from the scan itself, only for checks that did not pass: robots.txt welcoming AI crawlers (only when a block is confirmed or robots.txt is missing; "unverified" never triggers it), Organization + WebSite JSON-LD, an llms.txt starter, and canonical/Open Graph head tags with escaped values. Built with the same builders as the free tools; a test round-trips the robots.txt through the scanner's own parser. Copy and Download buttons. Full-report viewers see the code; free viewers see a locked teaser listing what is ready (no plan or price change; the section is client-side from fields already in the report, so nothing new is stored).
- Verified: tsc, eslint, 196 tests, build, screenshots of the sample report at 1280 and 390 px (no overflow). Local build used a temporary font stub (sandbox cannot fetch Google font files); not committed.
- DEPLOY STATUS: the rate limit lifted; `fe7863c` deployed successfully and includes the account leak fix, the AI SEO audit page and Fix Pack. Production checks (/, /pricing, /blog, /api/stats, /ai-seo-audit, /tools, /sample-report) all 200.

## 2026-10-04 (session 53)

- Market research recorded (docs/RESEARCH.md) and acted on, except affiliate links and the brand-mention check (owner decision: skipped for now).
- New `/ai-seo-audit` landing page (free AI SEO audit: six check groups each linking its free tool, FAQ + WebApplication JSON-LD), in the sitemap, footer and llms.txt. Homepage title, description and badge now lead with "AI SEO audit" and keep "AEO checker"; no claims or numbers changed.
- Verified: tsc, 190 tests, build, screenshots at 1280 and 390 px (no horizontal overflow). Local build used a temporary font stub because the sandbox cannot fetch Google font files; layout.tsx is unchanged in the commit.
- Not done: email capture (needs a privacy-policy change, owner), display ads (traffic too low), blog hubs (next weekend, 2-post cap already used).
- DEPLOY STATUS: production may still be behind `main` while Vercel's rate limit holds; the scheduled retry checks it.

## 2026-10-04 (session 52)

- SECURITY / paywall fix: `GET /api/account` returned each recent report's complete stored
  `result` (selected from `reports` and spread into the response). That JSON holds the paid
  sections, so any logged-in free user could read their own scans' AI recommendations, quick win,
  content gap and schema guidance in the dashboard request, without buying the full report. The
  route now returns an explicit summary per report (`lib/account-reports.ts`: id, url, score, date,
  retest counts, `unlocked`, `previousScore`) and never `result`. Regression tests: a route-level
  test with a secret marker in a mocked stored result (fails on the old code, passes now) plus
  mapper tests. Only the owner's own reports were exposed, and only through this endpoint (checked
  the other routes that select `result`: admin-only, Pro-gated or owner-scoped). Not exploited as far
  as is known; no access logs to check. No billing, price or plan-limit behavior changed.
- Dashboard trend: recent scans show a small green or red delta (for example "+9" or "-7") against
  the earlier scan of the same URL, from `previousScore` (derived from the stored comparison, no
  extra query). Hidden for first scans and unchanged scores. Verified at 1280 and 390 px with mocked
  account data.
- Verified: 190 tests, tsc, lint (0 errors), build.
- DEPLOY STATUS: the push for this fix was rate limited by Vercel ("Deployment rate limited -
  retry in 24 hours", ~100 deployments/day on Hobby), so the leak is fixed on `main` but NOT yet in
  production. The limit lifted by itself a few hours after the previous block; the next push after
  it lifts deploys everything on `main`. Retry with a small docs-only push until the commit status
  shows success; do not stack more features on top meanwhile.

## 2026-10-04 (session 51)

- Design fix from owner feedback on the live report: the "Since your last scan" card used a custom
  list layout that did not match the report. It now reuses the report's own components: the same
  `score-breakdown` tiles with score bars, small status labels and `mini-pill` chips (green for
  improved checks, red for worse), four tiles (Score Change, Checks Improved, Checks Worse,
  Unchanged) that fill the same 4-column grid as Score Breakdown, title-cased heading, stacking to
  2 columns on mobile. Removed the one-off `.report-diff-*` list CSS (only the two pill tints remain).
- The sample report's fictional earlier scan now covers every check (it listed only 6, so the card
  claimed "17 new checks").
- Verified: 187 tests, tsc, lint, build; screenshots at 1280 and 390 px next to Score Breakdown.
- Lesson: when adding a report section, build it from existing report components and compare it with
  its neighbors in a screenshot before shipping.

## 2026-10-04 (session 50)

- New report feature, "Since your last scan": when a signed-in user scans a URL they have scanned
  before (including paid retests), the new report carries `previous` (score, date, check id/label/
  status only) and shows a card with the score change and which checks improved or got worse.
  Proof that fixes worked is the point of retesting. Stored inside the report JSON, so no
  migration; the sample report demonstrates it.
- Touches the scan route (high-risk file): one added read-only lookup (`getPreviousReportSummary`,
  Supabase `reports` filtered by `user_id` and exact `url`) before the existing save, wrapped to
  fail soft; usage reservation, plan checks and paywall redaction are unchanged. Guests get no
  comparison. The summary carries no fix text or AI insights.
- Verified: 187 tests (diff logic, the lookup query/fail-soft cases), tsc, lint (0 errors), build;
  Playwright desktop + mobile on the sample report; a local scan still completes and has no
  `previous` without a database.
- Not verified against production data: needs a signed-in user with an earlier scan of the same URL.
  Check the first retest after deploy.

## 2026-10-04 (session 49)

- New free tool: Article schema generator at `/tools/article-schema-generator`
  (`lib/article-schema.ts`). BlogPosting / Article / NewsArticle JSON-LD with headline, URL, image,
  author (+ profile), publisher (+ logo), publish and modified dates; validates required fields,
  ISO dates, modified >= published, headline length (110) and URLs; `dateModified` defaults to the
  publish date. Runs in the browser. Generated markup passes the schema checker with nothing
  missing (tested). The report's Article Schema issue now links to it; added to the sitemap,
  footer, `/tools` and `/llms.txt`.
- Verified: 183 tests, tsc, lint (0 errors), build; Playwright desktop + mobile (auto-filled
  publish date, valid JSON-LD, modified-before-published warning, no overflow or errors).

## 2026-10-04 (session 48)

- New free tool: meta tag checker at `/tools/meta-tag-checker` (`lib/meta-check.ts`,
  `/api/tools/meta-tag-checker`). Grades title, meta description, canonical and Open Graph tags
  with the scanner's own checks (same thresholds and wording as the report), adds robots meta
  (noindex fails), viewport, page language, Twitter card and og:url vs canonical, and shows a
  search-result preview and a social-card preview. 30 per month per client/IP; `assertPublicUrl` +
  `fetchHtml`. Report issues for Page Title, Meta Description, Canonical and OG tags now link to it.
- Real runs: aeocheck.co (all pass), apple.com (title fail for the brand-only title, description
  warn), example.com (bare page), `[::1]` rejected.
- Verified: 178 tests, tsc, lint (0 errors), build; Playwright desktop + mobile, no errors or
  overflow (the og:image preview could not load inside the sandbox browser, which has no internet;
  the tool shows a placeholder in that case).

## 2026-10-04 (session 47)

- New free tool: sitemap checker at `/tools/sitemap-checker` (`lib/sitemap-check.ts`,
  `/api/tools/sitemap-checker`). Finds the sitemap through robots.txt `Sitemap:` lines or the
  default paths, validates XML, URL count (50,000 limit), duplicates, URLs on another domain, http
  and query-string URLs, lastmod validity/staleness/identical dates, follows up to five child
  sitemaps, spot-checks eight listed URLs (errors, redirects) and flags a sitemap robots.txt does
  not reference. Every fetch goes through `safeFetch`/`pinnedFetch`; 20 per month per client/IP.
  Motivation: our own sitemap sat unsubmitted in Search Console for months.
- Real runs: aeocheck.co (37 URLs, 10 without lastmod), stripe.com (index, 9 sitemaps, 4,508 URLs in
  the first 5), vercel.com (8,522 URLs), wikipedia.org and example.com (none found), `[::1]` rejected.
- Report issue "Sitemap" links to the checker; the tool is in the sitemap, footer, `/tools` and
  `/llms.txt`.
- Verified: 174 tests, tsc, lint (0 errors), build; Playwright desktop + mobile (fixed a list
  layout bug where child sitemap rows inherited another tool's grid).

## 2026-10-04 (session 46)

- Two new free tools, chosen because the scanner recommends exactly these fixes:
  - `/tools/robots-txt-generator`: pick a policy (visible in AI search without training, allow all,
    block all, or per crawler) for 12 AI crawlers, add a sitemap line and extra disallow paths,
    copy or download robots.txt, with warnings (blocking a search crawler removes you from that
    engine's answers; user agents may ignore robots.txt). `lib/robots-generator.ts` is tested by
    parsing every generated policy back with the scanner's own parser (`describeAiCrawlerAccess`).
  - `/tools/organization-schema-generator`: Organization (+ linked WebSite) JSON-LD from name, URL,
    logo, description, profile links, contact and founding date, with input validation; tested by
    running the output through the schema checker (no missing required or recommended properties).
    Shared `lib/jsonld.ts` escapes `<` for both this and the FAQ generator.
- Report issues can now show several tool links: AI bot access / robots.txt -> crawler checker +
  robots generator; schema checks -> schema checker + Organization generator
  (`TOOLS_FOR_CHECK`, test-guarded). Both tools are in the sitemap, footer, `/tools` index and
  `/llms.txt`.
- Verified: 164 tests, tsc, lint (0 errors), build; Playwright desktop + mobile on both tools (custom
  crawler toggle, sitemap line, invalid link warning, valid JSON-LD output, no overflow or errors).

## 2026-10-04 (session 45)

- First data-driven SEO work from Search Console (see the ROADMAP entry for the numbers). The
  homepage title is now "Free AEO Checker & ChatGPT Visibility Scanner | AEOCheck" (56 chars) with
  a description built around "AEO checker". The best AEO tools post (484 impressions, ranks 10-12
  for "aeo checker") got a direct answer section, a 2026 title (it said 2025) and the stale "20+
  signals" corrected to 25; three em dashes removed. Post edited in its own last commit so the
  on-publish workflow resubmits the sitemap (last submitted 2026-06-27) and pings IndexNow.
- Verified: tsc; link-lint unchanged (only the known missing hub link); homepage title 56 chars.
  Live effect waits on Vercel's deployment rate limit (session 43).

## 2026-10-04 (session 44)

- Google Search Console is connected again. The owner created a service account, added it to the
  property and set the GitHub secrets/variables. The `GSC Feedback Loop` workflow had been disabled
  by GitHub for inactivity; once re-enabled, a manual run succeeded and committed
  `reports/gsc-feedback-2026-10-04.md` (3 striking-distance queries, no decay, no gaps).
- Added a manual, read-only `GSC Overview` workflow (`scripts/gsc-overview.mjs`): sitemap status,
  daily totals, top queries/pages, /tools pages and their queries, devices, countries.
- ROADMAP now holds the first data-driven items (aeo checker queries on the best-tools post, the
  checklist query landing on /blog).
- Note: production is still behind `main` because of Vercel's deployment rate limit (see
  session 43); GitHub's report commit and this one deploy after it lifts.

## 2026-10-04 (session 43)

- Found that production stopped updating: Vercel's Hobby plan limits deployments to about 100 per
  day and returned "Deployment rate limited - retry in 24 hours" for the last two commits (docs and
  the `llms.txt` tool listing). Cause: every change was pushed to `main` plus two branches, and
  each branch push built a Preview deployment, roughly 4 deployments per change.
- Fix: `vercel.json` now disables deployments for `claude/*` branches; CLAUDE.md has a deploy
  budget rule (one push to `main` per finished item, branches only to claim and release, check the
  public commit status for the Vercel result, batch work when rate limited).
- State: `main` is ahead of production by the `llms.txt` tools listing and docs only; nothing
  user-visible is missing. The first push after the limit lifts deploys it. Everything shipped
  before 07:25 UTC is live (verified: CSS split, tools, scanner fixes).

## 2026-10-04 (session 42)

- Dogfooding: our own `/llms.txt` now lists the free tools hub and the five tools, so AI engines
  reading it learn about them. Verified with the same parser the scanner uses (`llms_txt` still
  passes) and the generated file is served as plain text.

## 2026-10-04 (session 41)

- CSS weight: moved the audit (`audit-*`), comparison (`vs-*`) and dashboard (`db-*`) styles out
  of `globals.css` into `app/audit/audit.css`, `app/vs/vs.css` and `app/dashboard/dashboard.css`,
  imported by those routes only. The global stylesheet every page downloads shrinks from 229.8 KB
  to 195.1 KB minified (-15%). Done by script with checks: all 2,494 CSS rules present exactly
  once; selector lists mixing moved and global classes were split so a mobile override still
  applies; a cascade check (shorthand-aware, across media queries) found one class that a later
  global rule used to override (`vs-cta-section`), which stays in `globals.css`.
- Verified with a before/after pixel comparison (baseline build vs new build, mocked API data)
  of /vs/profound, /audit, /audit/[id] and /dashboard (free and pro) at 1280 and 390 px: zero
  differing pixels except the intended fixes below.
- Fixed two mobile bugs the comparison exposed on the audit results page (pre-existing): the three
  header buttons ("All audits", "Dashboard", "Export PDF") overflowed the viewport (page was
  404 px wide at 390 px) and now wrap; the per-page category chips sat in a fixed 3-column grid
  and overlapped ("Performance 80" ran into "Trust 45"), they now wrap at natural width.
- Gotcha logged: `pkill -f "next start -p ..."` kills the agent's own shell (CLAUDE.md warns of
  this); use `kill $(pgrep -f "[n]ext-server")`.

## 2026-10-04 (session 40)

- Internal linking: the technical AEO guide now links the llms.txt generator, the schema markup
  checker, the FAQ schema generator and the content extractability checker where each topic is
  discussed, and the robots.txt post links the AI crawler checker. Each post edited in its own
  commit (publishing rule). No new posts (the two-per-weekend cap was used on 2026-10-03).
- Known: `node scripts/link-lint.mjs` still reports the spoke
  `how-to-check-if-website-appears-in-chatgpt-recommendations` missing its pillar hub link
  (`/blog/how-to-get-cited-by-chatgpt`, not written yet); it is not part of CI.

## 2026-10-04 (session 39)

- Comparison page accuracy: `/vs/profound` said Profound is "Enterprise only, no self-serve",
  but Profound's own pricing page now shows a free self-serve trial plus a custom-priced
  Enterprise plan. Corrected the price note, the meta description wording, the "Free scan" and
  "Self-serve access" rows, and a "no sales call" line. Every comparison page now carries a
  footnote that competitor details come from their public sites and were last checked in
  October 2026.
- Not changed: the other three competitors' claims (Otterly $29+, Semrush AI $99+, Peec $95+)
  match the October research notes in `docs/RESEARCH.md`; their "free scan: no" rows were not
  re-verified one by one. Re-check all four pages whenever the footnote date is bumped.
- Verified: tsc, build; footnote present on /vs/profound and /vs/otterly, "no self-serve" gone.

## 2026-10-04 (session 38)

- Alt text check: an image with `alt=""` (the correct way to mark a decorative image), a
  `role="presentation"`/`none` image or an `aria-hidden="true"` image now counts as handled; only
  a missing `alt` attribute is flagged. Marketing sites full of decorative images (Stripe: 31 of
  35 images have `alt=""`) were being failed for following accessibility guidance. Scores can only
  go up from this.
- QA sweep of 8 more real sites (github, notion, hubspot, moz, semrush, backlinko, healthline,
  bbc): no crashes, results consistent with the raw HTML.
- Verified: 152 tests (new: alt handling), tsc, lint, build.

## 2026-10-04 (session 37)

- Scanner accuracy, found by scanning 14 real sites (stripe, vercel, shopify, linear, wikipedia,
  apple, wordpress.org, paulgraham, nytimes, hacker news and others) and checking the results
  against the raw HTML:
  - Text extraction bug: on minified HTML (most modern sites) adjacent elements' text was glued
    together ("productHello", "FastSimple"), which roughly halved word counts and made the
    readability score collapse to 0, so almost every marketing homepage got a false "Poor
    readability: content is too complex" and some a false "Thin content". Text now keeps
    elements apart, and readability is computed on real prose (leaf paragraphs/list items of 5+
    words, each ended with a full stop) and left uncalculated (warn) when there is under 30
    words of prose.
  - Meta tags were matched case-sensitively, so apple.com's `name="Description"` was reported as
    "No meta description". Meta `name` selectors are now case-insensitive, and og:title /
    og:description / og:image also accept `name=` (common mistake that crawlers still read).
  - Grading calibrated: meta description is now pass 120-160, warn 30-250, fail only when missing,
    under 30 or over 250 (Vercel's 47-char and Linear's 65-char descriptions failed before);
    titles warn up to 90 chars instead of failing above 70. Brand-only titles ("Apple") still fail.
- Effect: scores of real sites moved up 1-4 points (stripe 87 -> 89, vercel 81 -> 85, linear 74
  -> 76, apple 73 -> 75). Nothing gets worse, so monitored URLs will not trigger score-drop
  alerts from this change; their trend lines will show a small step up.
- Verified: 151 tests (new: text spacing, readability on prose, no prose, case-insensitive
  meta/og, description and title boundaries), tsc, lint, build; before/after scans of 8 sites.

## 2026-10-04 (session 36)

- New free tool: schema markup checker at `/tools/schema-checker`. Fetches a page, parses every
  JSON-LD block (flags invalid JSON), lists the schema.org types (handles `@graph`, arrays, full
  type URLs and subtypes such as BlogPosting) and flags missing required and recommended
  properties for Organization, WebSite, WebPage, Article, FAQPage (also validates each
  question/answer), Product, SoftwareApplication, LocalBusiness, BreadcrumbList, Person and
  HowTo. Suggestions for missing identity/page/FAQ markup count a publisher or author declared
  inside another entity. Microdata and RDFa are not read (stated on the page). 30 per month per
  client/IP; `assertPublicUrl` + `fetchHtml`. Added to `/tools`, the sitemap and the footer;
  report issues for Schema Markup, Article Schema and Structured Data Density now link to it.
- Verified: 146 tests, tsc, lint, build; real runs on aeocheck.co (9 blocks, 9 types), a blog
  post, stripe.com, example.com (none found), `[::1]` rejected; Playwright desktop + mobile.

## 2026-10-04 (session 35)

- Report to tool funnel: an expanded issue in the report now ends with a "Free tool" link when a
  free tool fixes it: llms.txt File -> llms.txt generator, AI Bot Access and robots.txt -> AI
  crawler checker, FAQ Schema -> FAQ schema generator, Heading Structure and Answer-Ready Headings
  -> content extractability checker (`lib/tool-links.ts`; test guards that every mapped check id
  exists in the score engine and every target page exists). Hidden when printing/PDF.
  Shown for every plan since it links to free tools and sits outside the paywalled fix text.
- Verified: 139 tests, tsc, lint, build; Playwright on /sample-report: the four mapped issues show
  the right links, others show none, no page errors; mobile screenshot of the card.

## 2026-10-04 (session 34)

- Accessibility audit (Lighthouse mobile on /, /pricing, /blog, a blog post, /tools, a tool,
  /login, /signup, /sample-report): scores were already 100 for accessibility and SEO on the main
  pages. Fixed the real WCAG contrast failures found: white text on the bright green sample-report
  banner and priority badge (1.48:1, now dark text) and faint gray text on the login/signup forms
  (2.5-4.1:1, now at least 4.5:1). Removed the header brand link's `aria-label` so its accessible
  name matches its visible text.
- Left alone on purpose: the issue accordion buttons in the report keep their descriptive
  `aria-label` ("Expand details for X"), which Lighthouse flags as a label-in-name mismatch because
  the visible button text also holds category and priority pills; the label gives screen readers
  a cleaner name than the visible text would. `/login` is intentionally noindex.
- Verified: Lighthouse accessibility 100 on /, /login, /signup, /sample-report, /pricing after
  the fixes; screenshots of the banner and login form.

## 2026-10-04 (session 33)

- Discoverability: "Free tools" added to the Features dropdown (desktop) and the mobile menu, so
  the four free tools are reachable from the header on every page, not only the footer.
- Honesty fix: the homepage hero said the checklist was "Updated May 2026". The checklist was
  last changed in October 2026 (canonical and answer-ready heading checks, 25 total), so the label
  now says October 2026. Update it whenever the checks change.
- Verified: tsc, build with the public Supabase config; Playwright: dropdown shows 5 items and
  navigates to /tools, mobile menu shows 5 items.

## 2026-10-04 (session 32)

- Site sweep: loaded all 34 sitemap URLs at 390 px and checked status, console/page errors,
  failed requests, horizontal overflow, H1 count, image alt text and titles. Two findings, both
  fixed: `/blog/aeo-for-saas` had two H1s (a duplicate `# Title` in the MDX body under the page
  heading) and `/sample-report` had none (added a visually hidden H1). Everything else was clean.
- Known, not fixed: `node scripts/link-lint.mjs` reports the spoke
  `how-to-check-if-website-appears-in-chatgpt-recommendations` missing a link to its pillar hub
  `/blog/how-to-get-cited-by-chatgpt`, which is not written yet (temporary redirect in place). It
  clears when the hub post is published (blog cap for this weekend already used).
- Verified: build, H1 counts re-checked on a fresh build.

## 2026-10-04 (session 31)

- Lint cleanup: removed dead code and unused variables flagged by ESLint (an unused `handleReset`
  handler and `report` state binding in the homepage client, two unused derived values in the
  report and dashboard, an unused callback argument in the scraper). Warnings 22 -> 17, no
  behavior change. The remaining `set-state-in-effect` warnings sit in auth-adjacent clients and
  are left as is on purpose.
- Verified: tsc, lint (0 errors), 136 tests, build.

## 2026-10-04 (session 30)

- AI Visibility Tracker, still dark-launched (needs `AI_VISIBILITY_ENABLED=true`, an engine key
  and admin email; nothing visible to customers): runs are now saved to a new
  `ai_visibility_runs` table (additive migration `20261004_ai_visibility_runs.sql`, RLS read-own,
  service-role writes) and `GET /api/ai-visibility` returns history. Saving fails soft: without
  the migration a run still returns its results with `saved: false`. All-error runs are not saved.
- New noindex page `/ai-visibility` (not in nav or sitemap, admin only): brand, domain and
  category inputs, suggested prompts, per-prompt per-engine results (mentioned, list position,
  cited) and a mention/citation-rate history for the domain.
- Verified: 136 tests (store: save columns, missing table, network error, list scoping), tsc,
  lint, clean build; Playwright with mocked APIs: non-admin sees "not available", admin run
  renders rates, rows and history on desktop and mobile with no errors. Not run against the real
  Perplexity/Gemini APIs (no keys in this environment).
- Note: an incremental build once served a stale CSS chunk locally; `rm -rf .next` fixed it. CI
  and Vercel build clean.

## 2026-10-04 (session 29)

- Fonts: Geist and Geist Mono are now self-hosted with `next/font/google` (downloaded at build
  time, preloaded woff2). Every page previously blocked rendering on two stylesheet requests to
  fonts.googleapis.com (plus font files from fonts.gstatic.com); those requests and the two
  preconnects are gone, and the site no longer sends visitors' IPs to Google for fonts.
  `globals.css` now reads `--font-geist-sans` / `--font-geist-mono`.
- Finding: `experimental.optimizeCss` (critters) does nothing under the App Router, so the 228 KB
  global stylesheet is still one blocking request; the route-exclusive CSS groups that can be
  split out are listed in the ROADMAP.
- Verified: tsc, lint, 131 tests, build; no googleapis references in the homepage HTML; Geist
  loads (weights 400-800) and renders the same hero in Chromium. Local lab Lighthouse cannot show
  the gain (fonts are unreachable from the sandbox), and live lab runs through the proxy swung
  0.56-0.77, so the before/after number is not claimed.

## 2026-10-04 (session 28)

- New free tool: content extractability checker at `/tools/content-extractability`. Fetches one
  page and judges the opening passage under every H2/H3: too short (<20 words), too long (>90),
  starts by pointing back (This/It/They), filler opener, or no text; also counts question-style
  headings and passages with a concrete number. Pure heuristics in `lib/extractability.ts` (no AI
  cost), labeled as a structural check, not a citation prediction. 20 per month per client/IP,
  `assertPublicUrl` + `fetchHtml`. An H2 that leads straight into an H3 is treated as a wrapper,
  not flagged. Added to `/tools`, sitemap and footer.
- Research pass logged in `docs/RESEARCH.md` (engine citation differences, free-grader funnel,
  feature ideas). Follow-up email now says "25 checks" (was "20+"); a day-7 email was dropped
  because the follow-up footer promises no more than 2 emails total.
- Verified: 130 tests, tsc, lint, build; real runs on aeocheck.co blog, Wikipedia, stripe.com;
  `[::1]` rejected; Playwright desktop + mobile, no errors or overflow.

## 2026-10-04 (session 27)

- Homepage refactor: the static sections (stats, what we do, why it matters, how it works, who
  uses it, AI snapshot, audit signals, latest guides) moved out of the 1,300-line client component
  into the server component `app/components/HomeStaticSections.tsx` and are passed in as a prop.
  Same markup and styling (section heights identical to the previous build at 1280 and 390 px);
  `HomePageClient.tsx` 1,308 -> 1,112 lines; initial homepage JS 727 KB -> 689 KB raw.
  Lighthouse mobile lab score is unchanged within noise (0.75-0.76 both builds), so this is
  code-health plus a small bundle win, not a speed fix.
- Verified: tsc, lint, build; `/#how` anchor scroll, FAQ accordion, guide cards, no page errors.

## 2026-10-04 (session 26)

- New free tool: FAQ schema generator at `/tools/faq-schema-generator`. Runs fully in the browser
  (nothing sent to a server): add question/answer pairs, get FAQPage JSON-LD in a script tag to
  copy or download, with warnings for non-question headings, very short answers and half-filled
  entries. `<` is escaped in the output so answer text cannot close the script tag.
- New `/tools` index page linking the three tools; added to the sitemap and footer.
- Verified: 124 tests, tsc, lint, build; Playwright desktop + mobile (output parses as JSON,
  `</script>` in an answer is escaped, no overflow or errors).
- Follow-up: Search Console access (owner action) is needed to see which tools earn traffic.

## 2026-10-04 (session 25)

- New free tool: AI crawler checker at `/tools/ai-crawler-checker`. Enter a domain and see, for
  each of 12 AI crawlers, whether robots.txt allows or blocks it and which rule decided it (own
  group, inherited `*`, or no rule), grouped as search / training / user-triggered agents, with a
  one-line verdict and the raw robots.txt. Reuses the scanner's robots parser
  (`describeAiCrawlerAccess` in `lib/robots.ts`); fetches go through `safeFetch`; 30 per month
  per client/IP. Sites that 403 automated robots.txt requests get a clear message.
- Verified: 120 tests, tsc, lint, build; real runs on medium.com (GPTBot, ClaudeBot,
  Applebot-Extended blocked), cnn.com (all blocked), stripe.com, aeocheck.co; `[::1]` rejected;
  Playwright desktop + mobile with no errors or horizontal overflow.

## 2026-10-04 (session 24)

- Performance: supabase-js (223 KB raw incl. Realtime) is no longer in the initial script set of
  every page. The auth provider, header, homepage, upgrade/retest buttons and report page load it
  on demand via `lib/supabase-browser-lazy.ts` (same client singleton). Homepage initial JS
  951 KB -> 728 KB raw. Lighthouse mobile lab score is within noise (0.69-0.73 both builds) since
  the chunk still downloads right after hydration; LCP is still 4.5 s and needs the
  server-component split.
- Verified: tsc, lint, 116 tests, build; Playwright against a build with the public Supabase
  config: guest header shows Login, a stored session shows the account menu and /api/account is
  called, logout clears the session, homepage scan still sends the bearer token.

## 2026-10-04 (session 23)

- New free tool: llms.txt generator at `/tools/llms-txt-generator`. Enter a URL; it reads the
  homepage and sitemap, ranks up to 20 key pages (key paths first, max 3 per folder, legal/login
  pages under "Optional") and returns a ready-to-publish llms.txt to copy or download. Every fetch
  goes through `assertPublicUrl`/`safeFetch`; usage is capped at 10 per month per client/IP via
  the existing atomic usage reservation. Page has WebApplication + FAQPage JSON-LD, is in the
  sitemap and footer, and links to the scanner and technical AEO guide.
- Verified: 116/116 tests, tsc, lint (0 errors), build; local runs on stripe.com (9 s),
  linear.app (10 s) and aeocheck.co (2 s); `http://[::1]/` rejected; Playwright desktop + mobile.

## 2026-10-04 (session 22)

- Homepage honesty: the top bar counter no longer adds +1 at random every 6-18 s (a simulated
  "live" count) and no longer flashes a "2,800+" placeholder before dropping to the real number;
  it shows the real count once loaded.
- Rendering: pages faded in from opacity 0, which delayed first paint/LCP and left pages
  invisible to headless renderers once nothing else forced frames (found when Lighthouse returned
  NO_FCP). The page transition now slides without hiding content. LCP element is now the H1.
- Lighthouse mobile (local build): perf 73, LCP 4.6 s (unchanged), TBT 190 ms; deeper fixes
  (lazy Supabase client, server-rendered homepage sections) added to the ROADMAP with numbers.
- Found (owner decision): homepage claims "5,700+ scans" vs 977 from /api/stats (incl. +500).
- Verified: tests, lint, build; homepage renders on mobile with no errors; Lighthouse runs.

## 2026-10-04 (session 21)

- "Free scans used up" email: when a signed-in free user hits the monthly limit, they get one email
  that month with the reset date and upgrade options. The month is claimed in the database before
  sending, so concurrent blocked requests cannot send duplicates. Sends after the 429 response
  (`after()`), so it never slows the request. Inactive until migration `20261003_limit_email.sql`
  is applied and `RESEND_API_KEY` is set.
- Verified: 110/110 tests (no key, claim, already sent, column missing), tsc, lint, build; local
  scan smoke test still returns a result.

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
