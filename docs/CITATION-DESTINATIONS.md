# AI visibility source-destination method

Method `visibility-2026-10-v3` applies to new observations. The existing admin-only API and provider selection remain; this adds no customer plan entitlement, provider call, recurring job or public observation. Source URLs are returned by engines, not trusted instructions. Only the server API wires the safe destination verifier. Other internal callers without a verifier keep nonempty source lists unverified.

## Bounded verification

One run deduplicates engine source URLs across all answers and checks at most 20 unique URLs. Three workers send HEAD requests through the existing safe-fetch URL, DNS and redirect validation, with at most three redirect hops per URL and an eight-second shared deadline. No credentials/cookies/authorization, body reads, automatic retries or cross-run cache. This permits at most 80 HEAD exchanges including redirects; fewer occur when blocked or timed out. HTTP failures including 404/405 and sites that refuse HEAD remain unverified. There is no GET fallback. A deadline race settles a stalled DNS/transport promise; the abort signal stops dispatch where supported and late response bodies are cancelled. This is not a distributed concurrency/spend budget or a guarantee that OS-level DNS work instantly stops.

Each returned source retains its original URI plus bounded state, optional HTTP status/final URL (at most 4096 characters) or controlled reason. New fields use the existing private result JSON. The UI displays hosts only, avoiding source URL queries; full original and bounded final URLs remain private observation evidence. No historical observations are rewritten.

## Citation outcome

| Evidence in one answer | Outcome |
| --- | --- |
| Any successful final destination matches the brand's exact domain or a subdomain | Checked positive, even if another source is unknown |
| Every returned source resolves successfully and none matches | Checked negative for this returned source list |
| No positive and any source is blocked, failed, timed out or outside budget | Unknown; excluded from citation denominator |
| Engine returns an empty source list | Checked negative for this response only |

Mentions and within-answer list positions remain independent of source checks. A returned brand-domain URI can redirect away and lose its former positive classification; a wrapper URI can redirect onto the brand and become positive. This is an intentional new measurement method, not an organic ranking change. A successful HEAD establishes a destination observed by this verifier at that time, not that the source supports the answer, is high quality, is accessible to every engine or is the engine's exhaustive citation set.

Admin output shows the checked-answer denominator, unknown destinations and host-to-host evidence. History identifies older/unverified methods rather than presenting an old citation percentage as destination-checked. Old JSON and stored percentages remain unchanged; no cross-method growth conclusion is justified. Branded and unbranded answer counts remain visible but separate aggregate series are future work.

## Release evidence and limits

Regression tests cover both redirect directions, positive-plus-unknown and all-negative rules, empty lists, HTTP rejection, request caps, shared deduplication, concurrency, forced deadlines/late cleanup and existing safe-fetch SSRF/redirect checks using synthetic transports. Synthetic SSR markup from the actual admin component is reviewed at 1280/390 px in the isolated browser harness; this is not signed-in/provider production acceptance.

No provider run or production observation is needed to test these contracts. Live authenticated provider/admin acceptance, destination behavior on real engine URI samples, distributed budgets/cost accounting and separate branded/unbranded history remain open. Public search and AI-inclusion improvements require dated observed evidence; this release supplies measurement infrastructure only.
