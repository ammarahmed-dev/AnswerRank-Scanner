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

Database project discovery and documentation tools both return `Unknown tool` from the connected Supabase service. Live schema reconciliation, event-ledger migrations, atomic scan grants, durable audit jobs and email outbox remain blocked on a functioning database connection. The guards above do not replace those transactions or make concurrent audit requests atomic.

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
