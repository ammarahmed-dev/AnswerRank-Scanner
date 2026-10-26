# Audit implementation status

## Foundation release

Implemented on `codex/aeocheck-foundation`:

- Update Next.js and eslint-config-next to 16.4.3, Undici to 7.30.1, and source-map-js to 1.2.2.
- Share category score calculation across scan storage and report presentation. Preserve measured performance exactly and omit its numeric breakdown when unavailable. The report's existing performance summary explains unavailable measurements.
- Evaluate AI crawler access for the scanned path and query using the existing robots matcher.
- Reject failed configured database saves instead of falling back to local SQLite or retrying without ownership.
- Add regression coverage for measured/unavailable performance, category consistency, path rules and failed persistence.

Validation: 216 tests pass; type check and production build pass; lint has zero errors and 18 existing warnings. Dependency audit is recorded in the PR after the final lockfile refresh.

Review notes: category normalization can change displayed historical category breakdowns because the existing report reader recalculates them. Stored overall scores and historical monitor snapshots are unchanged. Explicit scoring versions and historical migration remain future work. Database schema drift now produces an actionable save failure rather than a false saved report.

## Remaining audit work

### Reliability guards release

- Validate malformed scan/comparison options before reserving usage.
- Require billing profile updates to return exactly one affected row, so missing profiles cause provider retries.
- Abort monitor schedule advancement after a snapshot write failure; check schedule writes and returned Resend errors; return 503 when due queries fail.
- Limit audit scans to saved targets, reject already-recorded pages, include valid zero scores in aggregates and clear settled timeout timers.
- Validation: 224 tests pass across 37 files; production build passes; type checking and lint are checked in CI.

Historical blocker, resolved 2026-10-25: earlier project discovery and documentation calls returned `Unknown tool`. Supabase now supports live schema inspection; transaction and durable-job work remains unfinished. The guards above do not replace those transactions or make concurrent audit requests atomic.

These items are not implemented by the foundation release:

1. Reconcile database schema and verify clean/upgrade migrations.
2. Add a durable billing event ledger and handle replay, ordering, missing profiles, refunds and repurchases.
3. Reserve one-time URL grants and retest rights atomically.
4. Correct final URL/origin handling, robots diagnostic states and lab/field performance terminology.
5. Fail safely when quota storage is unavailable; bound request/body sizes and propagate cancellation.
6. Make multipage audit execution durable and concurrency safe.
7. Add monitor leases, atomic snapshots and a retryable email outbox.
8. Reconcile checkout activation and shared plan limits.
9. Add operational/funnel instrumentation and data lifecycle handling.
10. Improve AI recommendation provenance and validate the gated visibility prototype.

Production schema, payment sandbox, email sink and actual deployment configuration still require verification. Work is proposed through PRs; completion of one PR does not mean the entire audit is complete.

## Fetch integrity release

- Analyze directly fetched HTML at its final URL; robots, fallback sitemap, llms.txt and PageSpeed use that page's origin (including scheme and port). A redirected robots file remains scoped to its original requested authority.
- Bound decoded response bytes during download for HTML, reader fallback, robots/sitemap, llms.txt and PageSpeed. Cancel rejected/error bodies and redirect bodies.
- Bound scan/compare request JSON to 32 KiB before usage reservation, with 413 for oversized payloads.
- Propagate caller cancellation to scanner fetches and PageSpeed. Audit timeouts now abort the underlying scanner request.
- Reject HTML/soft-error llms.txt responses and unverified robots bodies. Avoid claiming an inaccessible robots file was found.
- Store Lighthouse blocking time as `tbt`, retaining historical `fid` compatibility on read; remove the invalid time-to-interactive substitution. Label these measurements as lab performance, not a real-user Core Web Vitals assessment.
- Regression coverage: decoded/chunked limits, split UTF-8, cancellation, redirected origin/path/port, robots policy redirects, soft errors, unverified robots and TBT mapping.

Score impact: new scans can decrease when a formerly accepted HTML llms.txt error page is rejected or the resolved page's actual robots policy blocks crawling. Historical stored overall scores are unchanged. A missing TBT measurement no longer inherits the unrelated time-to-interactive duration.

This covers the fetch/cancellation portion of items 4 and 5. Atomic quota enforcement, reservation expiry, durable audit jobs and the database-dependent work remain open. Reader fallback does not independently verify a final page URL and retains the requested URL.

## Service failure guards

- Configured quota RPC HTTP errors, network errors and malformed successful responses stop work with 503, rather than falling back to weaker accounting or showing a misleading monthly-limit message.
- The missing-RPC 404 compatibility path remains until the live schema is verified. Its failed reads/writes now fail rather than pretending usage is zero or persisted. This path is still not atomic.
- Production without quota database configuration fails closed; local development remains available without credentials.
- The admin configuration health endpoint reports capabilities and accepts one supported recommendation provider. Optional missing providers no longer make core configuration look broken; the response explicitly does not claim connectivity or schema health.
- Validation: 252 tests across 41 files; type check, build and lint pass (18 existing warnings).

See IMPLEMENTATION-PLAN.md for the complete 17-item acceptance checklist and continuing work. The full plan is not complete.

## Tool and discovery boundaries

- All seven free-tool POST routes reject non-object JSON with 400 and payloads over 32 KiB with 413 before authentication, quota reservation or network work.
- AI crawler and robots tester downloads now enforce decoded 512 KiB limits during streaming; sitemap checker enforces a decoded 5 MiB limit. Rejected HTTP responses are cancelled.
- Page discovery bounds each page to 2.5 MB, keeps its timeout active during body consumption and cancels non-page/error responses.
- Comparison aborts the sibling scan when either scan fails before returning its quota reservation.
- Validation: 270 tests across 44 files, including malformed/oversized requests across all seven tool routes, oversized stream cancellation, quota release and comparison cancellation.

Connection state: the owner-approved Supabase integration became available on 2026-10-25. Read-only production inspection works. The production privilege correction was applied and checked after explicit owner approval on 2026-10-25.

## Visibility evidence integrity

- Preserve Gemini grounding source URIs instead of substituting display titles. Google source redirects are recorded as unverified until their destination is verified, and excluded from the citation-rate denominator rather than treated as a confirmed negative.
- All-engine failures return 502/unavailable and are not saved as zero-rate observations. Empty answers and malformed source URLs are rejected as engine errors.
- Save answer text, requested model, observation time, branded/unbranded classification and methodology version inside the existing JSON results. No new database columns are required.
- Retain answer inspection data in the admin API response and stored JSON; distinguish unresolved citations, disclose mixed prompt totals and label list position as within an answer rather than search rank. Legacy citation data is labeled unverified rather than silently interpreted under the new method.
- Bound provider JSON responses to 1 MB while streaming. Validate the admin request JSON and prompt limits before starting provider calls.
- Citation parsing follows Google's GenerateContent grounding documentation: https://ai.google.dev/gemini-api/docs/generate-content/google-search
- Validation: 275 tests across 45 files. Fixtures verify URI preservation, unresolved-source denominators, answer provenance, empty/malformed provider evidence and all-engine failure responses. Live paid-provider calls and admin production UI still require an available authenticated test session; no live provider verification is claimed. The local Chromium download returned invalid archives, so the new interactive answer-inspection section is deferred rather than added without browser QA.

Remaining A14 work: verified redirect resolution, separate unbranded/branded aggregate series, durable spend budgets/concurrency and weekly tracking integration. Existing saved rates are preserved; new observations carry visibility-2026-10-v2 provenance.

## Audit and monitor count guards

- Audit and monitor creation now require a successful database response with an exact numeric Content-Range count before starting discovery or adding a monitor. Database errors, network failures and missing/malformed counts return 503 instead of being treated as zero.
- Validate bounded object JSON for both authenticated routes; null/array roots return 400 and bodies above 32 KiB return 413 before count queries.
- Bound count requests to 10 seconds and cancel count-query response bodies after reading the header; use a consistent UTC calendar-month boundary for the existing one-time audit check.
- Validation: 292 tests across 46 files, including both routes with missing/malformed count headers, failed/network reads, exhausted limits, valid zero counts and malformed/oversized inputs.

These guards do not make count-then-insert atomic. Audit/monitor concurrency still requires verified database transactions and production schema access. No plan limit, entitlement or migration changes are included.

## Scoring provenance and immutable snapshots

- New manual/competitor reports, comparison results and successful audit-page JSON results carry methodology version aeocheck-2026-10-24-v1 and the scoring policy's numerical credits/caps.
- Versioned report and print category presentation reads stored snapshots, including valid zeros. Missing/invalid historical snapshot values stay unavailable instead of being regraded by a newer policy. Unversioned legacy reports keep their existing behavior.
- Record requested versus directly resolved URLs, HTML/reader provenance and measured/unavailable/not-requested PageSpeed. Reader fallback does not claim a verified redirect destination.
- Previous-report summaries retain a known method version. The methodology document explains today's distinct overall/category formulas and their limits.
- Validation: 300 tests across 48 files; save/read/public-preview roundtrip and streamed scan response, immutable category snapshots, unknown future versions, reader provenance and metadata isolation. One-off baseline comparisons against main matched on 1,000 weighted-status vectors and 25 deterministic checks/category scores for fresh example.com and aeocheck.co HTML captures. Wikipedia returned an HTTP error and was not part of the comparison. These are deterministic fixture comparisons, not paid PageSpeed or live end-to-end scan scores.

No numerical scoring changes, database migration, plan change or historical backfill. Remaining A05 work includes explicit unavailable/non-applicable aggregation, pinned legacy compatibility for future rule changes, cross-version delta presentation and versioned monitor snapshots after schema verification. See SCORING-METHODOLOGY.md.

## Supabase connection and table-access correction (2026-10-25)

- Connection exposure is resolved; read-only database inspection is available. Production schema exports and policy/grant snapshots are excluded from this repository change.
- Prepared an explicit browser access boundary: waitlist INSERT and public statistics SELECT, with other application data accessed through authenticated server APIs. Existing service-role grants are preserved.
- Six synthetic Postgres tests execute the actual migration and cover both browser roles, minimal inserts, duplicate handling, rejected returned rows, administrative privilege denial, service access, repeated application and future-table defaults.
- Validation: 306 tests across 49 files, type checking, lint (0 errors, 18 existing warnings) and production build. See DATABASE-ACCESS-AUDIT.md for scope and acceptance.
- Production permission migration applied and checked on 2026-10-25 after explicit owner approval. Catalog checks, denied anonymous private-table reads, retained public statistics/report reads and a rolled-back waitlist insert passed. Full signed-in customer journeys remain open. The repository filename matches the recorded migration version.

The connection itself no longer blocks schema work. Complete schema reconstruction, transactions and signed-in production acceptance remain unfinished.

## Required atomic quota reservations

- Verified the production quota functions under service_role inside a rolled-back synthetic transaction: two reservations reached the cap, a third was denied, and release permitted another reservation. Verification left no test rows. Browser roles cannot execute those functions.
- Removed the missing-RPC read-then-write compatibility path and its non-atomic increment helper. Missing functions now fail closed before scan work. Commit rejects unsuccessful/unreserved requests in configured environments; non-production operation without database configuration remains available.
- Added isolated SQL tests of the existing migration for cap/release behavior, account/month isolation, nonpositive limits and browser execution denial. Queued PGlite calls use one connection and are not a multi-connection contention benchmark.
- Validation: 310 tests across 50 files, including actual SQL execution and missing-function fail-closed behavior; type check, lint and production build.
- Remaining A09 work: stable anonymous abuse protection, durable reservation identifiers/crash expiry and account/provider budgets. Full production contention testing remains open.

## Scan cancellation and recommendation response bounds

- Request abort and SSE cancellation propagate to the scan core, recommendation provider and competitor scans. Stream emission/closure is guarded after disconnect; unfinished pre-persistence work releases its reservation once and does not save a report.
- Competitor timeout aborts the underlying scan instead of merely abandoning its promise. A timed-out competitor remains an unavailable competitor result, while the completed primary report can still save.
- Once report persistence begins, disconnect does not abandon the existing save/usage-settlement path. This is not a new database transaction and does not solve the separate one-time grant/retest atomicity work.
- DeepSeek, OpenRouter and Gemini recommendation responses are bounded to 1 MB of decoded bytes; provider deadlines remain active during body reads. Cancelled callers do not start fallback providers, HTTP error bodies are cancelled, and error payloads are omitted from provider logs.
- Validation: 323 tests across 52 files, including core/request/stream cancellation, AI and competitor cancellation, competitor timeout, late persistence completion, provider success across all three adapters, oversized/stalled bodies and no fallback after cancellation. Type checking, lint and production build remain release gates. No paid provider calls or authenticated production scan is claimed.

Remaining A11 work includes other non-tool input boundaries and cancellation through the remaining callers. Recommendation provenance, stronger output schemas, useful caching and durable budgets remain A13 work.

## Retest unlock URL scope

- Owned retest seed lookups include the stored report URL. Inherited unlocks require that URL to normalize to the current scan target. An unlock cannot be transferred to another host, page, query or scheme by supplying a source report ID.
- Matching URLs retain existing behavior, including normalization of host casing and fragment removal. Missing/malformed stored URLs grant no inherited unlock. Ownership filtering remains in the database query.
- Validation: 331 tests across 53 files, including eight streamed scan/save regressions covering matching and mismatched sources, preview redaction and ownership query filtering. Type checking, lint and production build are release gates. Authenticated production retest acceptance remains open.

This closes the cross-URL seed gap only. Atomic purchase/retest reservations, count updates, expiry/recovery and failed-scan consumption remain A03 work; no new entitlement or retest-count policy is introduced.

## Seven-day SEO sprint started (2026-10-25)

- Added docs/SEO-SEVEN-DAY-SPRINT.md, grounded in the owner's current Search Console export. The export and raw metrics are not committed to this public repository. Different date windows and query/page aggregation are explicitly distinguished.
- Refreshed the existing best-AEO-checker guide with a decision table, evidence checklist, accurate free/paid descriptions and readiness-versus-observed-visibility boundaries. Corrected the HubSpot description against its primary product page; existing competitor comparison-page work is not overwritten.
- Blog metadata preserves the original publication date and optionally records an actual update in visible text, Open Graph, JSON-LD and XML sitemap output. Unchanged static pages no longer receive fabricated build-time lastmod values.
- XML and HTML sitemaps share the 14 public tool links, with tests for canonical host, uniqueness, route existence, stable dates and private-route exclusion.
- Validation: 334 tests across 54 files, type checking, lint (0 errors, 18 existing warnings) and production build passed. Local production HTML confirms canonical URL, original/updated dates, JSON-LD/Open Graph parity, 48 sitemap entries and public tool links.
- Existing on-publish IndexNow/GSC notification work is triggered by the blog update. Accepted notifications do not prove crawling, indexing or ranking. Seven-day ranking gains are a target, not a guaranteed result.

Remaining: verify deployed metadata and notification status, follow the dated sprint priorities, obtain like-for-like query/page results when available, and report actual changes with Search Console lag. No bought links, bulk pages, outreach messages, prices or entitlements are part of this release.

## Remaining JSON request boundaries (2026-10-25)

- Checkout creation, contact submissions, internal welcome email, monitor frequency updates and audit-page scans use the shared 32 KiB decoded-byte limit and require an object JSON root. Malformed/scalar/array/null JSON returns 400; oversized bodies return 413. Existing authentication and contact rate-limit ordering is retained.
- Contact and welcome fields are checked as strings before trimming. Wrong field types return validation errors rather than throwing. Valid checkout variant selection, owner predicates, contact normalization and welcome normalization retain their current behavior.
- Regression tests cover malformed input, multibyte byte limits without Content-Length, cancellation of oversized chunked streams, authentication before body reads, and valid mocked downstream paths. No actual email, checkout, customer write or production migration is part of verification.
- Validation: 394 tests across 55 files, type checking, lint (0 errors, 18 existing warnings) and production build passed.
- Remaining A11 work: signed webhook raw-body bounds are coordinated with the separate billing PR; caller cancellation and remaining outbound response/time budgets still require verification. This release does not finish the complete audit.

## Report history scoring compatibility (2026-10-25)

- Numeric report deltas and improved/regressed check labels require the same recorded nonempty methodology version on both scans. Different or missing versions, including two legacy scans without versions, do not imply compatible scoring rules.
- Incompatible report history preserves the earlier score/date and explains why changes cannot be interpreted reliably. The current scan becomes the suggested baseline. The dashboard receives no previous-score input for an incompatible delta, while stored scores and report access/redaction remain unchanged.
- The comparison section is extracted into a small component using the existing report card classes. Matching methods retain the existing card structure, including zero scores.
- Validation: 419 tests across 56 files, type checking, lint (0 errors, 18 existing warnings) and production build pass. Rendered-component tests exercise matching, changed and unknown methods; account API tests verify that incompatible delta inputs are omitted without leaking paid content. Local production sample/report entry pages return 200.
- Visual fixture screenshots are unavailable because the cloud browser rejected the fixture URL protocol. No desktop/mobile screenshot verification or authenticated production history journey is claimed. Existing report card classes are reused.
- Remaining A05 work: explicit unavailable/not-applicable aggregation, pinned legacy category compatibility and verified versioned monitor snapshots with guarded monitor/email deltas. No monitor schema change, migration or historical backfill is included.

## Versioned monitor observations (2026-10-25)

- Added nullable methodology_version to monitor snapshots. Existing rows retain NULL; no historical method is invented and no scores are rewritten. The CLI-created migration filename matches the recorded production version 20261025022537.
- Manual scans and scheduled scans persist the method produced by runScanCore. Owner-filtered list/history reads include it. Numeric list deltas, email drop alerts and category changes require matching nonempty recorded versions. Incompatible email observations are labeled as a new baseline.
- The history chart retains every observation, draws segments only across adjacent matching versions, and renders isolated unknown observations neutrally. Existing chart/report classes are reused; no desktop/mobile screenshot acceptance is claimed because the browser fixture URL protocol is blocked.
- Database verification: isolated Postgres executes the actual base monitor migration plus the additive upgrade; legacy zero scores and JSON survive, old/new writers work, repeated application preserves rows, and browser read denial/RLS remain intact. The production DDL dry run rolled back, then the migration applied successfully. Catalog and zero-row service-role SELECT/INSERT checks passed with no customer-row reads/writes; security-advisor findings are unchanged.
- Validation: 439 tests across 58 files, type checking, lint (0 errors, 18 existing warnings) and clean production build passed. The first local build hit a stale cache error; preserving the old cache and rebuilding resolved it.
- Signed-in production monitor/history and actual notification delivery remain open. Tests use a mocked email provider; no live cron or actual messages were triggered. Complete database baseline reconciliation, monitor leases, atomic snapshot/schedule writes and retryable email outbox are still unfinished.

## Atomic monitor persistence (2026-10-25)

- Manual and scheduled monitor scans use one service-only SECURITY INVOKER RPC to lock the owned monitor, insert its versioned snapshot and advance last_scanned_at with the same database timestamp. Both writes must affect one row; any failure rolls back the transaction.
- The shared client requires one valid returned observation, caps response bytes and applies a 10-second deadline. Missing/failed RPCs fail closed without reverting to split writes. Manual saves return 503 on persistence failure; cron does not count completion or attempt email after a failed save.
- The additive migration was inspected against production contracts, tested in isolated Postgres and dry-run in a rolled-back production transaction, then applied as 20261025032921. Post-apply checks verify invoker security, service execution, browser execution denial and a rolled-back missing-owner call. Security-advisor findings are unchanged. No customer rows were read or written by these checks.
- Validation: 457 tests across 60 files, type checking, lint (0 errors, 18 existing warnings) and production build pass. SQL fault injection covers raised and silently suppressed writes, zero scores, method preservation, wrong owners and browser roles. Client/route tests cover response validation, byte bounds, RPC failure without split-write fallback and no email after failure.
- The CLI created the migration file but its unrelated analytics request was blocked by automatic review. No further CLI request was needed; development continued from the existing generated file and production changes used the connected database tools. No telemetry approval was assumed.
- Remaining A08 work: scan leases, idempotent retry/crash recovery, durable email outbox/dedupe, calendar periods and retention/downgrade policy. A timeout after a committed RPC can still leave a client uncertain; no automatic retry or exactly-once scan/email claim is made. Signed-in production scan/readback and actual email delivery remain unverified.

## Atomic billing mutation receipts (2026-10-25)

- Replaced direct profile patches with a service-only SECURITY INVOKER RPC. It locks the profile, recognizes an exact-body SHA-256 receipt, checks the previously read plan/expiry/subscription identity, then commits the whitelisted patch and receipt together. Conflicts and failed/zero-row writes roll back and return retryable webhook failures. Exact replay is acknowledged without overwriting a later profile state.
- Preserved existing variant, status, cancellation and refund decisions. Only profile-mutating paths use the receipt; ignored/unsupported events are still acknowledged without an inbox record. This is not complete provider-event ordering, a durable queue or authoritative subscription reconciliation. Changed payload bytes have different identities.
- Signed raw bodies are bounded to 256 KiB before parsing/work, signatures require canonical 64-digit hex, and signed null/array roots return 400. Profile reads and mutation responses have body/deadline limits; failed receipt storage cannot fall back to direct profile mutation. No raw webhook payload is stored in the ledger.
- Production contract inspection confirmed the existing receipt key/timestamp and profile field types. The additive function passed isolated SQL and a rolled-back production dry run, then applied as migration 20261025043328. Invoker/security grants and a rolled-back missing-profile call passed; browser execution is denied and security-advisor findings are unchanged. No real payment event or customer-profile mutation was used in production verification.
- Validation: 479 tests across 62 files, type checking, lint (0 errors, 18 existing warnings) and clean production build pass. Nine SQL tests cover atomicity, replay after changed state, optimistic conflicts, suppressed writes, whitelist enforcement and role denial; nine RPC-client tests and fourteen signed-handler cases cover the boundary and existing state decisions. Queued PGlite calls use one connection, not a multi-connection contention benchmark.
- PR #9 was reviewed and not merged: its separate fail-open lookup/write cannot provide this atomic guarantee. This release replaces that approach; do not merge its older implementation over this one.
- Remaining A02 work: distinct-event ordering, authoritative reconciliation, missing-profile recovery, ignored/failed event inbox and replay, refund/repurchase grant semantics, live provider sandbox and true multi-connection contention tests. A timeout after commit remains uncertain until exact redelivery recognizes the receipt. No live checkout, refund, valid provider webhook or email was triggered.


## Manual monitor and audit-page cancellation (2026-10-25)

- Manual monitor scans pass caller cancellation and a 30-second total scan deadline to the scanner. Both routes check again after late results and before persistence. An audit disconnect no longer creates an error page or advances audit progress. Active-caller audit timeouts still record an error result.
- Owner-filtered database reads retain their authorization predicates and now enforce 10-second deadlines through body reads, bounded decoded responses (16 KiB monitor; 2.5 MB audit) and array-root validation. Read failures return unavailable before scans begin. Audit write response bodies are cancelled and logs exclude database payloads.
- Writes already dispatched settle independently of the caller, under their own deadline. A late failed write is reported as uncertain failure, not cancelled-before-save. This cannot guarantee rollback after a database timeout and does not solve audit lost updates, leases, retry identity, durable execution or monitor email delivery.
- Validation: 497 tests across 63 files, type checking, lint (0 errors, 18 existing warnings), production build and local authenticated-boundary smoke checks. Eighteen new tests cover cancellation during reads/scans, oversized and stalled bodies, late scan results, total deadlines and writes that settle or fail after disconnection. Signed-in production scan/readback remains unverified; no customer scan or production write was triggered.


## Atomic audit page appends (2026-10-25)

- Replaced stale read/replace writes with a service-only SECURITY INVOKER function that locks the owned audit and rechecks current status, saved target membership and duplicate URLs. Each accepted page appends to current results and commits progress, aggregate score, completion status and timestamp together. Distinct pages cannot replace each other's stored results through this route. Zero scores count; failed pages do not enter the average, and all-error averages remain null.
- The RPC client bounds response bytes and keeps its deadline active through body reads. Missing/unavailable RPCs fail closed, without legacy PATCH fallback. Save-time duplicate/finished conflicts return 409, a missing owner returns 404, and invalid result/state returns 400. Already dispatched saves settle independently of cancellation, with ambiguous transport failures remaining failures.
- Live contract inspection verified only the relevant column types, primary key, grants and absence of triggers. Synthetic SQL tests use the repository's historical audit schema rather than a production metadata export. The additive function passed synthetic tests before application as migration 20261025062756. Production checks confirmed invoker mode, empty search path, server-only execution, unchanged security-advisor findings and rejection of a random missing audit inside a rolled-back call. No customer audit result was read or modified for verification.
- Validation: 538 tests across 65 files, type checking, lint (0 errors, 18 existing warnings), production build and local access-control smoke checks. New cases cover queued distinct appends, duplicate rejection, atomic rollback/suppressed updates, owner/target checks, malformed inputs, completion and failed-page averages, RPC contracts and save-time route conflicts. Queued PGlite tests use one connection, not a real contention benchmark.
- Remaining A07: durable jobs/leases, avoiding duplicate provider work, idempotent recovery after an uncertain committed response, automatic execution beyond the browser loop, atomic creation caps and true multi-connection/signed-in production tests. The browser's local result list can be stale during overlapping sessions and needs a reload to show the complete persisted audit. This release does not claim the full audit plan is complete.


## Atomic monitor creation caps (2026-10-25)

- Monitor creation now calls a service-only SECURITY INVOKER function. A namespaced account advisory transaction lock serializes the count and insert, using a fresh read-committed snapshot after waiting. The function fails closed under snapshot isolation, returns an explicit exhausted-cap result, preserves the owner/URL unique constraint and rejects silently suppressed inserts. No plan limit, price, existing monitor or frequency was changed.
- Authentication and public-URL validation still run before database work. The existing server-derived caps (Free/one-time 1, Pro 10, Agency/admin 999) cannot be overridden by request fields. Duplicate and cap responses retain 409/422. Missing/unavailable RPCs return 503, with no separate count/direct-insert fallback. Responses are bounded to 128 KiB with body-active deadlines and validated committed fields.
- The live table contract, owner foreign key, unique constraint, browser/server grants and default/role transaction isolation were inspected without customer-row reads. Tests use the historical repository monitor schema, not an exported production metadata snapshot. Migration 20261025073228 is applied; invoker/volatile mode, empty search path, server-only execution, unchanged security-advisor findings and a rolled-back unknown-owner foreign-key check passed. No customer monitor row was read or modified for verification.
- Validation: 566 tests across 67 files, type checking, lint (0 errors, 18 existing warnings), production build and local access-control smoke checks. SQL tests cover cap enforcement, account isolation, actual advisory-lock lifetime, uniqueness, foreign-key/suppressed-write rollback, snapshot-isolation rejection and browser role denial. API/client cases cover unchanged caps, ignored input overrides, safe URLs/auth, conflict mapping, malformed success bodies, deadlines and decoded-size limits. Old monitor count-header tests are replaced by the atomic contract tests; audit count guards remain.
- PGlite queues a single connection, so real multi-connection contention and signed-in production creation/readback remain unverified. Account-plan changes concurrent with authentication, retry identity after an uncertain committed response, monitor scan leases, durable email delivery and retention/downgrade reconciliation remain open. Existing over-cap monitors are retained. The full audit plan remains unfinished.


## Atomic audit creation caps (2026-10-25)

- Audit creation keeps its existing exact-count prechecks to avoid unnecessary discovery, then calls a service-only SECURITY INVOKER function. A namespaced account advisory transaction lock protects a fresh check of UTC-month and rolling windows plus insertion. The row's creation time is captured after locking, matching the enforced windows. Snapshot isolation fails closed. Existing Free/one-time/Pro/Agency/admin limits and page limits are unchanged; uncapped tiers remain uncapped.
- The RPC stores owned targets, discovery count and initial progress together. It validates target shape/uniqueness and page bounds, rejects suppressed inserts and returns an explicit exhausted-window result. The route retains 429 responses even when another request reaches the cap during discovery. Missing/unavailable RPCs return 503 with no direct-insert fallback; response bodies have byte/deadline limits.
- Live inspection verified the creation fields, table grants, default/role isolation and lack of audit triggers. The migration adds `total_discovered` only when absent, reconciling the historical base migration with the existing live/API field. Synthetic tests cover both base-schema installation and preservation of an existing discovery-count field. Migration 20261025082909 is applied. Production checks confirmed invoker/volatile mode, empty search path, server-only execution, empty-target rejection inside a rolled-back call and preservation of the discovery-count column type/default/nullability. Security-advisor findings are unchanged. No customer audit rows were read or modified for verification. This is not the full A10 baseline.
- Validation: 605 tests across 69 files, type checking, lint (0 errors, 18 existing warnings), production build and local access-control smoke checks. Fifteen SQL cases cover queued limits, UTC-month boundaries under a different timezone, rolling windows, uncapped/account-isolated creation, advisory lock lifetime, rollback, invalid targets, browser denial and upgrade preservation. Twenty-four client/API cases cover unchanged tier/admin parameters, late cap conflicts, ignored request overrides, unavailable RPCs, body limits and deadlines.
- Remaining A07: durable discovery/page jobs, leases, retries and recovery, avoiding duplicate discovery work, server execution independent of the browser, signed-in production creation/readback and true multi-connection contention tests. PGlite queues one connection. A committed request can still have an uncertain transport outcome; reload history before retrying. No full plan completion is claimed.
- SEO measurement access: fresh read-only GSC Overview retrieval succeeded on 25 October, with performance data ending 23 October. The blanket access blocker is resolved. PR #43 subsequently resolved priority-guide joint query/page retrieval; its successful live output was inspected. Post-release measurement remains open. Private metrics and exports stay outside the public repository.


## Atomic one-time-plan report consumption (2026-10-25)

- Removed the unchecked profile PATCH before report persistence. Full one-time-plan scans now use a service-only SECURITY INVOKER function that locks the current profile, checks its paid plan/expiry, URL and existing four-total-scan cap, inserts the owned report and increments/locks the profile counter/URL in the same transaction. Failed or silently suppressed report/profile writes roll back both sides. Reusing an existing report ID cannot consume another right.
- The bounded RPC client accepts only the matching saved report ID and never falls back to separate writes. Unconfirmed saves tell the viewer to check report history before starting another scan. Preview reports, subscribers, admins and free-plan report unlocks keep their existing save paths and access rules. The previous-report read precedes a fresh cancellation check; a disconnected caller cannot begin saving after that read, while already dispatched transactions finish and settle monthly usage.
- Live inspection verified only the relevant profile/report types, constraints, grants and absence of triggers. SQL tests use a synthetic contract fixture rather than production metadata. Migration 20261025094214 is applied; invoker mode, empty search path, server-only execution and a rolled-back random missing-profile call passed. Security-advisor findings are unchanged; no customer row was read or modified for verification. New report JSON retains its producing method, score, owner association and existing retest fields. No prices, total scan allowances, refund rules or repurchase semantics are changed.
- Validation: 638 tests across 72 files, type checking, lint (0 errors, 18 existing warnings), production build and local rejection smoke checks. Fourteen SQL tests cover atomic save, queued caps, different-URL conflicts, duplicate IDs, raised/suppressed write rollback, missing/changed/expired rights and browser denial. Eleven RPC tests cover receipts, byte/deadline limits and fail-closed behavior; eight streamed scan cases cover success, failures, previews/subscribers and both cancellation boundaries. The schema-upgrade fixture startup timeout now matches the existing database-setup allowance, with assertions retained.
- A03 remains partial: no purchase-scoped reservation ledger, grant expiry/recovery, repurchase identity or free-plan unlocked-report retest-counter transaction is claimed. Concurrent provider work can still run before rights are checked at save. Monthly usage settlement is separate; a committed RPC can have an uncertain transport outcome and require report-history/reconciliation. True multi-connection and signed-in production acceptance remain unverified. PGlite queues one connection; no production customer mutation is used as a test.
- Owner steering: SEO, AEO and GEO are now ongoing parallel priorities in the existing continuation task and SEO sprint document, including after the seven-day sprint. Prioritize current guides/tools, technical discovery, accurate entities/schema, original credible evidence, repeatable AI-answer observations and actual conversion measurements. Preserve urgent correctness work and all private-metric/attribution limitations.

- Owner priority update (25 October): qualified non-branded discovery is the first growth task alongside the audit, starting with the best-AEO-tools guide and its scanner conversion path. The SEO sprint records evidence, delivery and measurement acceptance steps; branded CTR remains a separate small-sample baseline.

## Implementation-services research and plan (2026-10-25)

- Completed source-backed presentation research and code inspection of the existing shared CTA and contact-subject/storage flow. Added SERVICES-PRESENTATION-PLAN.md with page structure, package concepts, CTA placement, intake/privacy/operations, measurement and staged acceptance criteria.
- Prioritized A17/A15 implementation alongside the non-branded growth work. S01-S06 remain open: no dedicated service page, added CTA placements, analytics destination verification or live lead-delivery acceptance is claimed by this documentation release. No application, database, price or entitlement changes.
- Validation: documentation links and whitespace checked; existing CI runs regression tests, type checking, lint and production build before merge. The full implementation audit remains unfinished.

## SaaS long-query content follow-through (2026-10-25)

- Applied the owner's query-discovery approach to the supplied export privately; selected relevant SaaS product-discovery/measurement intent as a content opportunity, without inventing joint query/page attribution.
- Refreshed the existing SaaS guide with a direct answer, question-to-page planning, practical fix/verification steps and separate readiness, AI-answer and acquisition measurement. Corrected search/training crawler conflation, unsupported guarantee-like language and the claim that Google AI traffic is absent from Search Console. Added verified primary references and relevant existing tool/guide links. Preserved the original publication date/title and recorded the real update date.
- Targeted joint query/page retrieval and matching-window post-release measurement remain open. No ranking gain, AI inclusion, service-page delivery or complete audit completion is claimed. No private analytics, new pricing or plan changes.
- Content-link validation: the refreshed SaaS guide passes the existing targeted hub/scanner link check. The full-site content-link script still flags the unchanged comparison guide as missing its legacy `/blog/best-aeo-tools` hub, which redirects back to that guide. This pre-existing topical-map inconsistency is recorded separately; no redirect/self-link is added to satisfy it.

## Read-only joint query/page measurement (2026-10-25)

- Added targeted query/page evidence to GSC Overview for commercial checker intent, the existing priority guides and nonbrand long-query candidates. Requests share fixed Pacific-calendar dates, finalized Web data and explicit country/device scope. Bounded pagination reports possible truncation; JSON preserves full labels and precision. API/section errors fail the job rather than claiming a successful partial refresh.
- Overview requests a read-only OAuth token; existing sitemap-submit callers retain their original scope. The existing workflow runs manually or on diagnostic-file changes to main, with contents:read and no new recurring schedule, repository metric commits, notifications or customer mutations. New regression cases exercise fixed dates, scope, pagination, exact pairing, label preservation and error propagation with mocked APIs.
- Runtime acceptance completed on 25 October: the reviewed Overview job authenticated successfully and returned actual dated priority-guide query/page pairs; no configured cap was reached, without establishing API completeness. The full audit, service implementation, country/device segmentation and post-release ranking/conversion measurement remain open. Do not copy private output into this file.

## Initial implementation-services page and enquiry path (2026-10-25)

- Implemented `/services/aeo-geo-implementation` with scoped engagement options, delivery process, illustrative verification example, operator identity, FAQ and the existing contact form in service mode. Added canonical metadata, Service structured data and XML/HTML sitemap discovery. Updated existing shared blog/tool CTAs and added one completed-report CTA with a controlled placement code; no report URL/ID/token is placed in the link.
- Service intake validates website/scope/platform/source and serializes context into the current private message field. A server-generated receipt ID, decoded-body limit and deadline gate the saved confirmation. Missing/mismatched/failed saves return an uncertainty message before notification; existing nonservice subjects remain supported. Field errors expose invalid state and focus the first invalid field. The saved confirmation does not claim email delivery, a booking or a purchase.
- Inspected live contact table columns/RLS/grants only: existing text storage and service-only access support this release without a migration or customer-row read/write. Mocked API tests cover validation, exact receipts, failure/oversized responses, unchanged general contact behavior and best-effort email failures. Report-access regressions remain in the release gate.
- S01/S03 implemented; S02 remains partial until a real authorized production enquiry/readback and notification acceptance are verified. S04-S06 broader discovery, analytics destination verification and qualified-lead review remain open. No valid production test enquiry, email, price or entitlement change. The complete audit remains unfinished.
- GSC follow-through: PR #43's live Overview completed with targeted guide/query pairs and no configured cap reached. Its performance window predates these releases; pairing is verified but post-release attribution is not. Private metrics stay outside this repository.
- Browser release gate: CI starts the production build without production credentials, blocks external browser requests, uses synthetic full/preview report fixtures and intercepts valid contact submissions. Capture and inspect page, form and neighboring report screenshots at 1280/390 px before merge. Keyboard field focus, invalid API input, sending/retry/success UI and existing contact subjects are checked; a real valid production enquiry/readback and notification delivery remain unverified. Local browser startup is restricted and the hosted preview requires Vercel sign-in, so CI artifacts provide the review surface.


## Mobile navigation and implementation-service discovery (2026-10-25)

- Public mobile navigation now renders without Supabase configuration, uses the same 1200px breakpoint as desktop navigation, and keeps closed links out of tab/accessibility navigation. Escape, focus exit, outside pointer, link navigation and desktop resize close the panel; expanded features scroll within the viewport. Authentication methods and authorization checks are unchanged.
- Added implementation-services links to shared desktop/mobile navigation and footer, plus one contextual homepage and software-pricing CTA. Existing content/report CTAs remain; new source codes are allowlisted and self-reported, not verified analytics events.
- The owner requested published service pricing: scoped USD starting prices of $499 one-time, $999 one-time and $499/month, with explicit time/page/task limits, exclusions and a final written proposal. This does not change software plans or start checkout/subscriptions.
- Regression gate includes auth-config-independent navigation rendering, configured guest/account controls, service discovery, browser keyboard/open/close/scroll behavior at mobile/tablet widths, pricing visibility, and new CTA screenshots at 1280/390. Production enquiry/email and analytics destination acceptance remain separate open work.

## Canonical tools-hub consistency (2026-10-26)

Resolved the recorded comparison-guide self-redirect requirement: tools pillar and generation links now target the existing published hub, the duplicate planned legacy slot is removed, and both published tools spokes link directly to the canonical guide. The guide links back to those live spokes. Legacy URL redirect and original publication dates/titles remain intact. Site-wide link lint runs in CI; a negative fixture verifies missing hub links fail. This is crawl/internal-link maintenance, not evidence of traffic, ranking or AI-citation gains. Full audit and production service/analytics acceptance remain open.

## AI insight response validation (2026-10-26)

Reject malformed roots, missing/wrong/blank required fields, excessive arrays and oversized provider response fields before report persistence. Accept bounded JSON (optionally a complete JSON fence); discard extra fields and provider-claimed detected schema. Existing scraper grounding and editorial schema guards remain authoritative. Invalid output now uses the existing local-recommendation path rather than displaying raw provider text as a completed analysis. Deterministic score/checks and report rights are unchanged. Regression coverage exercises invalid and valid complete scan/save paths with mocked providers; no live provider request is claimed. A13 remains partial: provenance, prompt isolation, cache and cost/concurrency controls remain open. Growth baseline and production service/analytics acceptance are unchanged.
