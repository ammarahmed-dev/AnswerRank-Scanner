# AEO/GEO implementation services: research and delivery plan

Research date: 25 October 2026. Status: researched and prioritized; the service page, new placements and lead attribution are not implemented. This plan extends A17 growth/business validation and A15 conversion measurement. Preserve ongoing non-branded SEO and the complete audit. Urgent security, paid-rights and data-integrity failures retain precedence.

## Decision

Create one dedicated `/services/aeo-geo-implementation` page, labelled **Implementation services** in navigation. Explain the offer in plain language: **Turn your website audit into implemented fixes.** Use AEO/GEO terminology in supporting text and metadata for relevant intent. Keep software pricing and service engagements distinct; a scanner subscription does not include implementation.

The immediate offer is a scoped implementation project, with ongoing improvement as a separately scoped follow-on. Start with request-a-proposal rather than checkout, invented prices or long commitments. No new prices, subscription entitlements or paid activation changes are authorized by this plan. Validate enquiries and delivery capacity before expanding the offer.

## Research and evidence

Sources were reviewed on 25 October. Public presentation patterns are observations, not proof of their conversion performance. No competitor analytics or service-demand volume was available.

| Reference | Observed pattern | AEOCheck application |
| --- | --- | --- |
| [Brickell Digital AI Visibility](https://www.brickelldigital.com/ai-visibility) | Hero with consultation and package links, foundation and ongoing engagements, defined work cadence, process and measurement sections | Use its package/process hierarchy as a reference. Lead with implemented work and verification; do not copy design, prices, commitments, logos, testimonials or implied results. The exact earlier shared link could not be recovered; this is a publicly located matching reference. |
| [Screaming Frog](https://www.screamingfrog.co.uk/) and [SEO services](https://www.screamingfrog.co.uk/search-engine-optimisation/) | Distinct agency-services and SEO-tools navigation under one brand | Keep Scan website and Implementation services as separate paths. Do not replace tool access with a sales gate. |
| [HubSpot technical consulting projects](https://www.hubspot.com/services/professional/technical-consulting/projects) and [ongoing consulting](https://www.hubspot.com/services/professional/technical-consulting/ongoing) | Separates one-time projects and ongoing guidance, explains scoping and differentiates consulting from hands-on implementation | State exactly who changes the website, what the client supplies, what gets verified and which work is excluded. |
| [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features) | Search fundamentals remain relevant; there is no required special AI text file or special schema for those features | Sell useful technical/content implementation. Do not imply schema or llms.txt guarantees AI inclusion, or that Google guidance establishes behavior for every other engine. |

No measured evidence establishes that three packages, a specific CTA label or these placements will outperform the existing path. These are product recommendations to validate with actual enquiries.

## Existing AEOCheck journey

Source inspection: `app/components/ServiceCta.tsx` already appears on blog articles, tool pages and `/ai-seo-audit`. It links to `/contact?subject=services`. `ContactForm.tsx` preselects Optimization services; `/api/contact` accepts that subject and persists to `contact_messages`. Its notification path is best effort, so saved enquiries and delivered email are different states. The general contact-page introduction focuses on reports/billing/scanner questions.

There is no dedicated implementation page or service-specific URL/platform/package fields in the inspected contact form. No explicit service-funnel event implementation was found; GTM in the layout alone does not verify analytics configuration or delivered events. Reuse the existing lead path and improve it instead of duplicating forms or stacking promotional blocks. Do not expose private reports or contact records as public proof.

## Page presentation and section order

1. **Hero:** clear implementation offer and short audience statement for site owners and small teams. Primary CTA: Request an implementation proposal, anchored to the page enquiry form. Secondary: See what is included, anchored to scope/packages. Add a restrained existing-scanner link for visitors who need diagnosis first.
2. **What changes on your site:** concrete examples such as resolving crawl/canonical conflicts, repairing applicable structured data, clarifying page headings/answers and improving relevant internal links. Explain that every change depends on the audit and platform access.
3. **Choose the scope:** show the three engagement options below as comparable cards; use custom-scope labels with no invented price, most-popular badge, delivery deadline or unlimited work claim.
4. **How delivery works:** review existing report/site, agree scope/access and acceptance checks, implement in a reviewable staging change, publish with the client's authorization, then verify and hand over a dated change log. No password collection in the enquiry form.
5. **What you receive:** scoped backlog, implemented changes, verification evidence and handover. Show a clearly labelled illustrative example if no approved service case study exists. Keep readiness checks, organic results and observed AI mentions in separate evidence sections.
6. **Who implements the work:** factual operator identity, supported capabilities and relevant development experience. Do not imply Brickell Digital endorsement or reuse its client outcomes as AEOCheck results. Only show project names/logos/testimonials with permission and correct attribution.
7. **FAQ:** software versus service, platform/access dependencies, content approvals, one-off versus ongoing work, what is measured and why rankings/citations cannot be guaranteed.
8. **Enquiry form:** repeat the primary CTA with a concise description of what happens next. Do not promise a response time until operations support it.

Reuse existing site typography, surfaces, buttons and spacing. Avoid a separate agency-style theme, autoplay media or heavy decorative animation. Keep packages readable as a single column on mobile, with visible scope differences rather than a wide comparison grid. At most one primary commercial action per section; no exit-intent popup or blocking scan upsell.

## Proposed engagement options (scope concepts, not published entitlements)

| Option | User need | Scope to agree before delivery |
| --- | --- | --- |
| Website fixes sprint | I have findings and need someone to fix them | One site's agreed priority issues/templates, platform access, explicit exclusions, acceptance checks and handover. Default entry engagement. |
| Key-page improvement | My important pages need technical and content work | A named page set, technical fixes, answer/content structure and internal links; client supplies and approves factual business claims. |
| Ongoing improvement | I need continued iteration after the foundation | A defined monthly backlog/capacity and review cadence; organic data where authorized and separately scoped AI-answer observations where tooling/budget are verified. |

Do not sell schema alone as the entire service. Exclude guaranteed placements, purchased links, unsolicited outreach, unlimited content and invented case studies. Do not silently bundle implementation into existing SaaS plans. Supported platforms must reflect actual delivery capability; broader custom stacks are reviewed before accepting work.

## CTA placement and hierarchy

| Surface | Recommended display | Suggested CTA | Constraint |
| --- | --- | --- | --- |
| Completed scan/report | One compact block after the actionable findings/next steps | Want help implementing these fixes? | Preserve reading, rescan, export and paid report rights. Do not use a low score as alarmist sales copy or reveal gated/private findings. |
| Relevant blog articles | Replace destination/copy of the existing shared ServiceCta | Get help applying this to your website | Keep the relevant scanner/tool action prominent; do not add a second competing service card. |
| Tool results/pages | Reuse existing service block after useful tool output where practical | Need help implementing this on your site? | Complete the tool task first. Show one service block, not one per finding. |
| Homepage | One supporting section after the product explanation or sample report | Explore implementation services | Retain Scan website as the primary hero action. |
| Software pricing | A separate short section below software plans | Prefer hands-on help? | Explain services are separately scoped; no changes to software prices/limits. |
| Shared header/footer | A plain Implementation services link | Implementation services | Keep mobile navigation compact and scanner access prominent. |
| Dashboard | Later, only when evidence warrants it | Get implementation help | Not in the first batch; avoid promotional clutter in routine workflows. |

Start with the service page plus redirecting the existing shared CTA and one report placement. Expand to homepage/pricing/navigation in the next verified batch. All links target the same canonical service page; avoid duplicate AEO/GEO/SEO service pages or platform doorway pages.

## Lead intake, privacy and operations

Reuse the current contact storage flow. First inspect live schema and policies if adding fields; do not assume an additive migration is safe or necessary. An initial version may format validated service context into the existing private message without a schema change. Preserve general, report and billing enquiries.

Required: name, email, website URL and a short description of help needed. Optional: platform, engagement preference and existing report reference. Budget/timeline may be optional later; do not force phone, meeting booking, account creation or a completed scan before enquiry. Use a controlled package/source vocabulary, explicit bounds and server validation. Do not fetch submitted website URLs as part of intake; later fetching must use the existing safe-fetch boundary.

Only prefill a report reference/site after authorized display and clear user choice. Never put report tokens, customer URLs with secrets, messages, email addresses or names into analytics or attribution query strings. Keep source placement as a short allowlisted code; treat client-provided attribution as untrusted, not an authenticated report association.

A submitted enquiry is a request for scoping, not payment, a booked call or a service contract. Verify persistence and honest error/success behavior with mocked notifications. Do not send test lead emails or customer messages during acceptance. Establish a private owner review process for saved enquiries before promoting the offer widely; a valid Resend key alone does not prove notifications arrive.

## Measurement and acceptance

Proposed events: `service_cta_click`, `service_form_start`, `service_lead_saved`, each with allowed placement and package codes only. Audit current GTM destination/configuration and consent behavior before adding events or claiming delivery. A success event fires only after confirmed storage; clicks/retries must not be counted as qualified leads. Do not install another analytics vendor just for this funnel.

Private funnel: service CTA interactions -> service-page visits -> saved enquiries -> manually qualified opportunities -> agreed projects. Define qualified as a real contact with a site and a relevant implementable need; exclude spam, tests and duplicates. Use saved enquiries as the initial source of truth; compare accessible traffic denominators only when event delivery is verified. Compare appropriate date windows and do not infer conversion rates from a handful of clicks. No public lead totals, personal data or raw GSC exports in the repo.

## Implementation batches

- [ ] S01 Page and scope: implement canonical service page, copy, package concepts, honest proof, FAQ and enquiry journey. Add metadata and canonical sitemap/discovery entries; use truthful Service/WebPage structured data without fake aggregate ratings, prices or special-AI-schema claims.
- [ ] S02 Intake: reuse contact submission with service context, bounded server validation and saved-lead confirmation. Verify existing subjects, disabled/retry/error behavior and mobile/keyboard accessibility. Keep notification delivery status explicit. Do not add billing or publish rates.
- [ ] S03 Intent placements: update shared CTA and add the single completed-report block; verify all existing placements and both public/owner report states. No expansion of report visibility or paid rights.
- [ ] S04 Discovery: add the restrained homepage/pricing/footer/header placements after S01-S03 pass, with mobile hierarchy intact and no duplicate promotions.
- [ ] S05 Attribution: audit analytics configuration, implement privacy-safe allowed events/source codes and verify delivery where access exists; otherwise record the inaccessible destination and use private saved-lead evidence.
- [ ] S06 Review: assess qualified enquiries and delivery effort over the first available meaningful window. Adjust scope/placement based on evidence; public service prices or commitments require an owner decision. Add real case evidence only with authorization.

Ship S01-S03 as one coherent initial material release if feasible; split only where review/verification requires it. S04-S05 follow without delaying the first verified enquiry path unnecessarily. Scope research is complete; all six implementation items remain open.

Release gate: meaningful contact/CTA/access regression tests, type checking, lint, production build and CI. Check desktop/mobile screenshots at 1280 and 390 px, keyboard focus, form errors and narrow cards. After merge verify GitHub Vercel success, public route/canonical/links and the actual enquiry flow without sending unsolicited messages. Distinguish page deployed, storage tested, notification delivered and analytics destination verified. Continue the full audit and non-branded growth measurement in parallel.
