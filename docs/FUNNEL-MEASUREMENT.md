# Application funnel measurement

## Published configuration review, 27 October 2026

The public GTM-NJN4LTVJ resource at https://www.googletagmanager.com/gtm.js?id=GTM-NJN4LTVJ was retrieved read-only. Its published resource references Google tag G-PS7P9HTFPT. The two custom GA4 tags use click-text predicates: `Scan My Website` emits `GA4 Event - Scan Initiated`; `Send message` emits `contact_form_submitted`. These measure click intent, not successful scans or confirmed storage. The resource does not contain rules for the five application events below. The public resource is configuration evidence, not GA4 receipt, historical event counts or private conversion data. No account settings or GTM publication were changed.

No consent-init tag was visible in the reviewed resource. This does not establish the full runtime consent state or legal requirements. Connected tools do not expose GTM container editing or GA4 reporting; destination configuration, consent behavior and actual receipt remain unverified. Do not infer permission or delivery from the installed snippet alone.

## Application event contract

The app pushes to the existing data layer, without replacing it, adding storage, loading another vendor or making a direct analytics request. Missing/broken hooks must not interrupt the product task. This is application instrumentation only; a queued event is not an acknowledged analytics event or a server-side ledger.

| Event | Exact application trigger | Interpretation |
| --- | --- | --- |
| `scan_start` | Immediately before dispatching the homepage single-page scan request | An attempt; rejected/failed scans remain attempts |
| `scan_complete` | Client finalizes the result after the final progress step | Completed client journey; not a purchase or a server-wide count |
| `service_cta_click` | Shared content/tool/report/home/pricing service link activation | Placement intent; not a qualified lead |
| `service_form_start` | First focus within the service form during a component lifetime | Interaction; not validated input |
| `service_lead_saved` | Successful contact response with literal `success: true` | Confirmed save acknowledgement; not notification delivery, qualification or a contract |

Every message has only `event`, `aeocheck_event_version` (1), `aeocheck_source` and `aeocheck_engagement`. Sources are the existing service allowlist; engagements are `unsure`, `fixes`, `key-pages`, `ongoing`. Unknown values become null. Scanner messages clear both service dimensions. Source codes are self-reported placement, not authenticated association or organic attribution. Never add scanned URLs, report IDs/tokens, names, emails, free text, provider responses or client/account identifiers.

Form-start and lead-save signals are guarded once per mounted form. Failures/uncertain storage/retries produce no saved-lead signal before a confirmed response. Reloads, blockers and closing a tab can lose client signals; use authorized private saved records as the lead source of truth, with tests/spam/duplicates excluded. No production lead or test email is needed to verify the contract.

## Destination acceptance still required

A GTM operator must review native Custom Event triggers for the exact names above and allowlist only the documented parameters in the existing GA4 destination. Review consent defaults/updates with native consent APIs before enabling tags. Review automatically attached page location/referrer and user properties as well: URLs with report tokens, scanned-site query strings or other private data must not reach analytics. Do not map generic click text, form values or arbitrary data-layer fields. Do not duplicate the old click tags as completed conversions; keep attempts and outcomes separate.

Verify allowed events and consent behavior with Tag Assistant plus actual GA4 receipt in the authorized account. Confirm failure/retry behavior, deduplication and sanitized page context before treating event totals as reliable conversions. No new dashboard, vendor, API key or GTM publication is introduced by this repository release. Existing guide-to-scanner/sample links are tested, but guide-level acquisition attribution remains unverified.

Primary implementation reference: https://developers.google.com/tag-platform/tag-manager/datalayer (event handlers, custom triggers, variable persistence and consent APIs). GTM configuration inspection does not provide current GSC/GA4 performance. Compare matching dated windows only after real delivery is verified; private metrics stay outside this repository.
