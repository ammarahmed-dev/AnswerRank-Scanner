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
