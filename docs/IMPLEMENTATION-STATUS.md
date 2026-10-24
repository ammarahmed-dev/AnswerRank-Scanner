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
