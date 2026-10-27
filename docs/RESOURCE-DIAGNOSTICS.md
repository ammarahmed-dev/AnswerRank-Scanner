# Auxiliary resource evidence

New scans attach a bounded server-observed diagnostic to the robots, sitemap and llms checks and to methodology.evidence.resources. This records the scanner request outcome, not another crawler's access, indexing, ranking or AI-answer inclusion. Legacy reports omit diagnostics and remain unknown; no backfill or provider inference is performed.

| State | Evidence | Existing check credit |
| --- | --- | --- |
| available | Response passes the existing content heuristic | Pass |
| not_found | Observed HTTP 404 only | Robots/sitemap fail; optional llms warning |
| blocked | Scanner received HTTP 401, 403 or 429 | Warning |
| http_error | Other nonaccepted HTTP status | Warning |
| invalid_response | Unrecognized content, HTML soft error or response byte limit | Warning |
| unreachable | Fetch did not complete, including a timeout | Warning |

Only numeric HTTP status and controlled state/reason codes are saved. No response body, exception text, access token or additional resource URL is added to diagnostic evidence. The display explains that a failed or restricted request does not establish file absence. A 410 remains a warning under the existing method rather than silently changing scoring policy.

Five-second deadlines remain active through streamed body reads; decoded limits remain 2.5 MB for robots/sitemap and 500 KB for llms. Caller cancellation propagates. Origin and redirect limits, declared sitemap selection and content heuristics remain unchanged. These are recognizable-content checks, not complete XML/robots/Markdown conformance validators. Optional llms summaries and crawler allowance do not prove citations.

The overall scoring method, thresholds, weights and status credit are unchanged. Regression snapshots were captured against pre-change main for identical valid/missing/restricted/server-error/invalid/network/oversized evidence. New behavior preserves those overall/category scores and resource statuses. Read-only captured HTML/resource replay from AEOCheck and example.com also matched all 25 check statuses and overall/category scores against pre-change main; raw captures were not committed. Diagnostic details and remediation guidance change; a timeout now settles with unverified evidence rather than waiting indefinitely on a stalled response.

New unverified fetch evidence suppresses replacement-file starters; recommendations ask visitors to verify request status/access and retry first. Known missing files may receive optional reviewed starters. Legacy starter compatibility remains, with review language instead of a claim that an unknown file is missing. Deliberate crawler/private-path restrictions must be preserved before publication. No generator publishes changes automatically.

Primary references reviewed 27 October 2026:

- https://developers.google.com/search/docs/crawling-indexing/robots/intro explains voluntary crawl rules and indexing limitations.
- https://developers.google.com/search/docs/appearance/ai-features explains Google AI-feature eligibility and the absence of additional special optimization requirements. This does not establish every other engine's behavior.

Reader final-URL provenance, crawler-category measurement, hosted signed-in/provider acceptance and the full implementation audit remain open. Readiness is separate from measured organic performance and observed AI answers.
