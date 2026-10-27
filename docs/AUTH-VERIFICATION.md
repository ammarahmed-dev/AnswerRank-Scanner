# Account verification and unavailable rights

A presented bearer credential is verified through the Supabase Auth server, followed by the service-owned profile read. User-editable JWT/user metadata does not determine plan or administrator rights. Verified plans and expiration behavior are unchanged; the profile remains the authority for paid/one-time context and the existing email allowlist remains the administrator authority.

## Outcomes

- No bearer token: existing guest result, without an Auth/profile request.
- Explicit Auth HTTP 400/401/403 rejection: existing unauthenticated/guest behavior is preserved.
- Auth configuration/transport/429/server error or malformed success: verification unavailable.
- Auth success but profile HTTP/JSON/type/readback failure: verification unavailable, never an invented Free profile.
- Authoritative empty profile read: at most one existing ignore-duplicates bootstrap write, then a required valid reread. A concurrent paid profile is retained. No retry or compensating mutation after a failed/lost write reply.
- Valid expired profile: existing Free expiration rule. Malformed expiry/plan/counter authority is unavailable.

Unavailable results have no trusted identity and every current API consumer checks the explicit flag before further authorization, quota, provider or mutation work. Public scan/tools cannot silently treat this condition as an authenticated Free request or guest fallback. APIs return a generic 503 with private/no-store cache policy; response bodies contain no plan, identity, raw provider response or exception text. The unused standalone getUserPlan helper throws rather than returning Free when authority is missing or failed.

## Bounds and side effects

One ten-second deadline spans Auth/user/profile resolution and existing profile bootstrap. Decoded Auth JSON is limited to 64 KiB and profile JSON to 16 KiB. The abort signal remains active through body reads; an outer deadline race settles even a transport/DNS promise that ignores abort, and late responses release their bodies without starting a profile write. Fixed Auth/Data API requests reject redirects; service credentials never go to the browser. Logs use controlled codes/statuses, not identifiers, tokens, URLs or raw errors.

The existing best-effort welcome marker/notification path remains separate from rights authority. Failure after a valid profile cannot overwrite verified rights, and cancelled late work cannot dispatch a notification. No test email is sent; this does not establish email delivery, deduplication or a durable outbox. No schema/permissions, prices, quotas, granted rights or billing variants change.

## Verification and limits

Synthetic queries cover valid roles/expiration, user-metadata rejection, failure responses and malformed data, body limits, stalled bodies/headers, cancellation/late cleanup and first-profile creation/readback races. Integration tests invoke all current guarded API methods and ensure unavailable verification returns 503 before downstream fetches or quota work. No production user/profile rows, payment sessions, provider calls or emails are involved.

This closes a server fallback, not the full auth/activation audit. The current browser AuthContext can still show a guest state after an account-request failure; known-session display and recovery need separate work. Live signed-in/hosted Auth/Data API acceptance, billing recovery and durable jobs/outboxes remain open.

Supabase changelog and current Auth documentation reviewed 27 October: https://supabase.com/changelog.md and https://supabase.com/docs/reference/javascript/auth-getuser. No TLS configuration is modified or claimed tested.
