# Published software offers

`lib/software-offers.ts` is the shared published software catalog for the dedicated pricing page: existing names, USD amounts, billing periods and card highlights. It consumes existing `PLAN_LIMITS` feature defaults. The checkout route imports only its paid identifier list. The module is not the authority for rights, quotas, configured provider prices or granted purchases.

The initial catalog preserves Free $0 forever, Starter $9 one-time, Pro $19/month and Agency $49/month. The implementation-service offers are separate and unchanged. Server environment overrides, usage/reservation logic, provider variant mappings, payment amounts/payloads, one-time grants and report/PDF access are unchanged. Activation and payment sandbox acceptance remain separate work. Do not treat a published catalog as verification of billing-provider configuration.

## Corrected structured data

On 27 October, the public pricing response's Agency offer described -1 monitored URLs, leaking an internal unlimited sentinel into machine-readable business facts. The visible card already said Unlimited monitored URLs. Offer descriptions now reuse the exact visible highlights, including Starter's single full-report URL scope.

SoftwareApplication now attaches the four Offer objects through `offers`; the former `hasOfferCatalog` relationship is defined for Organization, Person and Service. The application category is BusinessApplication with an AEO/SEO subcategory. Existing prices/currency and monthly UnitPriceSpecification values are retained; free/one-time offers do not acquire monthly billing. No invented ratings, reviews or customer outcomes are added. This does not claim Google rich-result eligibility, indexing, rankings or AI citations.

Primary definitions reviewed 27 October:

- https://schema.org/SoftwareApplication
- https://schema.org/hasOfferCatalog
- https://developers.google.com/search/docs/appearance/structured-data/software-app

## Verification and remaining work

A temporary comparison rendered the actual previous and new pricing components with identical mocked auth state for all five account plans, with loading true/false: all ten HTML outputs were identical. CSS/layout and visible/legal text remain unchanged. Permanent tests verify the actual server page JSON-LD and visible price/FAQ/highlight consistency, fixed published amounts/periods, unchanged enforcement defaults and all checkout identifiers/variant requests through mocks. Built-page browser checks validate JSON-LD and visible cards at 1280/390 px; no production checkout is created.

A12 remains partial: other product surfaces still have independent presentation, runtime environment overrides require reconciliation, configured provider prices are not verified, and activation polling/return recovery and signed-in payment/cancellation journeys remain open. GSC/AI-answer outcomes and conversion receipt need dated observed evidence, independently of markup correctness.
