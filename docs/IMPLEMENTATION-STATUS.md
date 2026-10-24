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

The Supabase connection is currently absent from this conversation; earlier project discovery and documentation calls returned `Unknown tool`. Live schema reconciliation, event-ledger migrations, atomic scan grants, durable audit jobs and email outbox remain blocked on a functioning database connection. The guards above do not replace those transactions or make concurrent audit requests atomic.

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

Connection state (owner clarification): Supabase access is already approved by the owner. The current conversation still exposes no Supabase tools and its connection lookup reports the integration as available for installation/connection. This is a connection exposure problem, not missing permission from the owner. Do not ask for repeated authorization or secrets. Continue independent work while checking whether the approved connection becomes available.

## Visibility evidence integrity

- Preserve Gemini grounding source URIs instead of substituting display titles. Google source redirects are recorded as unverified until their destination is verified, and excluded from the citation-rate denominator rather than treated as a confirmed negative.
- All-engine failures return 502/unavailable and are not saved as zero-rate observations. Empty answers and malformed source URLs are rejected as engine errors.
- Save answer text, requested model, observation time, branded/unbranded classification and methodology version inside the existing JSON results. No new database columns are required.
- Retain answer inspection data in the admin API response and stored JSON; distinguish unresolved citations, disclose mixed prompt totals and label list position as within an answer rather than search rank. Legacy citation data is labeled unverified rather than silently interpreted under the new method.
- Bound provider JSON responses to 1 MB while streaming. Validate the admin request JSON and prompt limits before starting provider calls.
- Citation parsing follows Google's GenerateContent grounding documentation: https://ai.google.dev/gemini-api/docs/generate-content/google-search
- Validation: 275 tests across 45 files. Fixtures verify URI preservation, unresolved-source denominators, answer provenance, empty/malformed provider evidence and all-engine failure responses. Live paid-provider calls and admin production UI still require an available authenticated test session; no live provider verification is claimed. The local Chromium download returned invalid archives, so the new interactive answer-inspection section is deferred rather than added without browser QA.

Remaining A14 work: verified redirect resolution, separate unbranded/branded aggregate series, durable spend budgets/concurrency and weekly tracking integration. Existing saved rates are preserved; new observations carry visibility-2026-10-v2 provenance.
