# Scoring methodology and report snapshots

## Versioned reports

New manual scans, competitor results, comparison results and successful audit-page JSON results record `methodology.version` (`aeocheck-2026-10-24-v1`). Their recorded checks retain the per-check weights and outcomes; `categoryScores` is the category snapshot produced with that method. The report reader and print presentation use that snapshot for versioned reports, including zero values. Missing or invalid snapshot values remain unavailable rather than being recomputed using a later policy.

The overall score remains the stored `score`. Existing reports are not migrated or assigned an invented original methodology. Unversioned legacy reports retain their current category-reading behavior; pinning that compatibility behavior before future algorithm changes remains necessary.

`methodology.evidence` records:

- The requested URL and HTML/reader source.
- A resolved URL and `finalUrlVerified: true` only for a direct HTML fetch whose redirect destination was checked by the scanner.
- `finalUrlVerified: false` and no claimed resolved URL for reader fallbacks. This does not imply that the fallback verified the final destination.
- Whether PageSpeed was measured, unavailable or not requested.

The previous-report summary carries a known methodology version when one exists. Report history compares scores and check statuses only when both scans record the exact same nonempty methodology version. Different methods, an absent version on either side, and two unversioned legacy scans are not assumed comparable. The report preserves the earlier score/date, explains the limitation and asks the user to establish a new baseline; the dashboard omits its delta badge. Stored numerical scores are unchanged. Monitor history/email comparisons remain separate unversioned work and are not covered by this report-only guard.

## Current overall calculation

For each recorded check, pass earns 1, warn earns 0.5 and fail earns 0. Multiply that credit by the check's recorded weight, add the results and divide by total recorded weight. Multiply by 100, round to the nearest integer and bound the result to 0-100. Empty or zero-weight input returns zero.

These values are centralized in `lib/scoring-policy.ts` and used by the scorer and methodology record. This release does not change check definitions, weights, thresholds or numerical credit.

## Current category calculation

Non-performance checks are assigned to their existing report categories. Pass contributes 100, warn 60 and fail 25; the category is their unweighted arithmetic mean, rounded to an integer. A missing base schema signal caps the Schema category at 45. Performance is only the measured PageSpeed score, including a valid zero; unavailable performance does not receive a fabricated numeric category score.

Category points and overall status credit are deliberately documented separately because they are different calculations. Recorded category snapshots preserve that distinction.

## Known limits and remaining work

This is a heuristic readiness assessment, not a measurement of AI search rankings, citations or customer traffic. Lab performance is not a real-user Core Web Vitals assessment. The current overall calculation still grants warning credit to unverified checks, while some non-applicable checks are represented as passing. Separating unavailable/non-applicable outcomes from failed checks requires a future version and corresponding presentation changes.

Monitor snapshots do not yet have a verified schema field for methodology, so this release does not add one or claim those snapshots are versioned. Production schema verification and a safe migration remain open. Live authenticated database readback and monitor version preservation have not been verified here.

Bump the method version whenever check definitions, thresholds, weights, status credit, category membership or category rules change. Preserve stored versions and snapshots. Document the score impact, legacy compatibility and cross-version comparison behavior in the same release.
