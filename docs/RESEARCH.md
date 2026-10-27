# Research notes

Market and product research that feeds `docs/ROADMAP.md`. Newest first. Cite sources.

## Crawler-tool evidence boundary - 27 October 2026

Source review for A06/A17: robots rules describe crawl preferences, not observed visits or citations. OpenAI separates OAI-SearchBot, GPTBot and user-triggered ChatGPT-User; a search opt-out can still leave navigational links, and user-triggered requests may not follow robots rules. Google-Extended controls specified Gemini training/grounding uses, independently of Google Search inclusion/ranking. Do not present a training preference as confirmed removal of existing model data or a search permission as observed inclusion.

Primary sources: [OpenAI crawlers](https://developers.openai.com/api/docs/bots), [Google robots introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended). Apply these limits to the existing tool; preserve scores and publication dates. No measured organic/citation improvement is established by this source review.

## 2026-10-25 - Implementation services presentation

Owner request: research how AEOCheck should show hands-on AEO/GEO services, using the Brickell Digital reference, then add the result to the plan. Findings and direct sources: [SERVICES-PRESENTATION-PLAN.md](SERVICES-PRESENTATION-PLAN.md).

The publicly located [BD AI Visibility page](https://www.brickelldigital.com/ai-visibility) shows defined foundation/ongoing packages, process and measurement. [Screaming Frog](https://www.screamingfrog.co.uk/) separates tools from agency services; [HubSpot](https://www.hubspot.com/services/professional/technical-consulting/projects) separates project scoping/guidance from hands-on execution. These are presentation references, not conversion evidence. [Google](https://developers.google.com/search/docs/appearance/ai-features) does not require special schema or AI text files for its AI search features.

Recommendation: one implementation service page, request-a-proposal scope options and an audit-to-fix-to-verification journey. Existing shared service CTAs and Optimization services contact intake already exist; improve that path instead of creating duplicate promotions. Keep readiness, observed AI answers, organic data and real enquiries separate. No prices, copied testimonials, guarantees or software entitlements change. Page/funnel delivery remains open under S01-S06.

## 2026-10-12 - Keyword strategy and revenue plan (owner: "scale to revenue, move to keywords with volume")

Evidence limits: no keyword-volume tool is available (web search returned only vendor claims, no per-keyword volumes). Search Console is the only first-party demand data, so the plan below is built on it plus public competitor pricing (Otterly Lite about $29/month for 15 prompts, Peec AI about $85-100/month for 50 prompts, Profound listed from $99 to $499, Semrush AI toolkit $99 per user; all secondary sources, verify before quoting).

What GSC (28 days to 2026-10-12) says: about 2.1K impressions and 8 clicks. Branded and "aeo checker" queries rank 10-20; every "AEO"-jargon query combined is tiny (single and double digit impressions). The utility families have the broadest query spread: schema/JSON-LD checker (101 impressions), sitemap checker (65), meta tag checker (39), all on page 5-8. Classic-SEO utility queries (JSON-LD checker, meta tag checker, sitemap checker, robots.txt tester, Open Graph checker, schema generator) have far more demand than AEO terms, and each tool already exists.

Plan:
1. Own the utility keywords: one strong page per query family (done for 3 tools; next robots.txt tester, Open Graph preview, FAQ schema validator), each with a clear funnel to the scanner and the services CTA.
2. Capture B2B intent: service leads via the new CTA (live). Measure rows with subject "Optimization services".
3. Convert free users: scanner report already gates fixes; the strongest hook is monitoring (alerts when a score drops) and the AI visibility tracker. Both need owner decisions on plan placement (see Owner actions).
4. Stop publishing AEO-jargon posts that cannot rank; publish posts only where a tool or GSC query exists ("how to fix ..." for each failing scanner check, linked to the matching tool).

## 2026-10-04 - Demand, competitors and monetization (Google Trends + public pages)

Method: Google Trends relative indexes via pytrends (no absolute volumes), competitor and affiliate
program pages, ad-revenue benchmarks. Absolute search volume was not available without a paid
keyword tool, so treat rankings below as relative, not counts.

**Demand.** The generic terms "AI SEO", "AI visibility" and "AI search visibility" carry more search
interest than the jargon "AEO"; "GEO" is rising but ambiguous (geography). Our copy leans on "AEO"
and "answer engine", so we miss the broader audience. Free "AI visibility checker" style tools are
the main acquisition pattern (HubSpot AI Search Grader, Semrush and Profound free reports,
Cituna's comparison of free checkers).

**Competitor gap.** Free checkers mostly test brand mentions in AI answers (needs paid LLM API
calls). Few give a technical, deterministic readiness audit plus fix-it tools. AEOCheck has this
and 10 free tools, but no free brand-mention check yet, which is the biggest single query family.

**Monetization without many paying users** (all figures are public benchmarks, not promises):
- Affiliate: Semrush pays $50-$300 per sale plus ~$10 per trial (120-day cookie); HubSpot 30%
  recurring for 12 months; Otterly 20% for 12 months; Rankscale 10-15%; Ahrefs has no program.
  AEOCheck readers are exactly Semrush/HubSpot buyers, and the tool pages already rank for related
  queries. Needs owner sign-up (IDs), plus a visible disclosure.
- Display ads: typical RPM $2-5 for this niche, so about $20-50 per 10K sessions. Only worth it
  after real traffic (GSC is at ~1.9K impressions per 28 days), and it hurts tool UX. Later.
- Email list (weekly "AI search changes" digest) turns free-tool traffic into an owned channel.
  Needs a privacy policy update (legal page, owner) before collecting.

**Resulting plan (ROADMAP Phase 5):**
1. Reposition copy and metadata toward "AI SEO / AI visibility" (keep AEO as the secondary term).
2. Free AI brand-mention check as the main traffic magnet (needs owner-provided Perplexity/Gemini
   keys and a monthly budget; engines already exist in `lib/ai-visibility.ts`).
3. Blog hubs next weekend (how-to-get-cited-by-chatgpt, measure-ai-search-traffic).
4. Affiliate slots with disclosure, after the owner provides program IDs.
5. Email capture only after the owner approves the privacy-policy change.

## 2026-10-04 - Market scan (secondary sources, treat numbers as unverified)

- Citation behavior differs by engine, so per-engine guidance matters: reports say only ~11% of
  domains are cited by both ChatGPT and Perplexity; Perplexity cites more sources per answer
  (~22 vs ~10) and has shifted toward sources with explicit data points, named authors and clear
  dates; ChatGPT Search surfaces business pages more often when schema.org markup is present.
  Sources: [5WPR citations report](https://www.5wpr.com/research/state-of-ai-citations-2026/),
  [Koira Q2 2026 changes](https://www.koira.ai/blog/ai-search-engines-changes-q2-2026-smb-response),
  [QuickSEO comparison](https://quickseo.ai/blog/chatgpt-vs-perplexity-for-ai-visibility-in-2026-citations-traffic-and-conversion-compared).
  These are vendor blogs, not primary data: do not quote their statistics on the site.
- ChatGPT mentions brands more often than it links them, so "mentioned vs cited" (already in the
  AI visibility tracker spec) is the right split.
- Competitors lead with free graders as acquisition: HubSpot's AI Search Grader, Profound's free
  AEO reports, plus free local tools (e.g. OmniGEO's content-extractability analyzer). Free,
  single-purpose tools are the established funnel; AEOCheck now has three (`/tools`).
  Source: [free AEO/GEO visibility checks](https://guptadeepak.com/how-to-check-aeo-and-geo-visibility-for-free-2026/).
- Coverage check: the scanner already scores author, freshness (datePublished/dateModified),
  schema, Q&A structure and answer-ready headings, so the reported signals are covered.

**Feature ideas (added to ROADMAP Phase 5):**
1. Content extractability tool: paste a URL, see which passages are quotable (answer-first,
   self-contained, with a concrete data point) and which are not. Deterministic, no AI cost.
2. "Citable facts" signal (numbers, named sources, dates in the first 100 words of key sections).
   Would be a 26th check, so every "25 checks" claim and the test guard change together; weigh
   against the copy churn first.
3. Per-engine tips in the report ("what Perplexity favors" vs "what ChatGPT favors"), only if a
   primary source can be cited.

## 2026-10-03 - AI crawler roles (drives the AI crawler check)

- OpenAI: OAI-SearchBot decides inclusion in ChatGPT search answers; GPTBot is training only;
  ChatGPT-User fetches on a user's request and robots.txt may not apply. Settings are independent.
  ([OpenAI crawlers](https://developers.openai.com/api/docs/bots))
- Anthropic: ClaudeBot (training), Claude-SearchBot (search quality), Claude-User (user fetches),
  each with its own token. ([Claude help center](https://support.claude.com/en/articles/8896518-what-is-claude-bot))
- Perplexity: PerplexityBot surfaces sites in Perplexity answers and respects robots.txt;
  Perplexity-User is user-initiated and generally ignores robots.txt; neither trains models.
  ([Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md))
- Google: Google-Extended is a robots.txt token (no crawler of its own) covering Gemini training
  and grounding in Gemini apps/Vertex; AI Overviews use regular Googlebot, so blocking
  Google-Extended does not remove a site from AI Overviews. ([summary](https://trakkr.ai/bots/google-extended/))

## 2026-10-03 - AI visibility tracking (the gap between the pitch and the product)

**Finding.** AEOCheck markets itself as tracking brand visibility across ChatGPT, Perplexity and
Google AI Overviews, but the product only scores on-page readiness. Real "does the AI mention my
brand?" tracking is the core feature of the dedicated tools.

**Competitor pricing (monthly):** Rankscale ~EUR 20, Otterly.AI from $29 (ChatGPT + Perplexity),
LLM Pulse from EUR 49 (5 models, share of voice), Peec AI from EUR 95, Profound $99-$499.
Sources: [Amplitude list](https://amplitude.com/compare/best-ai-visibility-monitoring-tools),
[LLM Pulse list](https://llmpulse.ai/blog/best-ai-visibility-tools/),
[Rank Masters](https://www.therankmasters.com/insights/ai-visibility/ai-brand-mention-tracking-tools).

**Engine costs per tracked prompt (one query):**
- Perplexity Sonar: ~$1/M tokens plus $5-$12 per 1,000 requests depending on search context
  ([Puter breakdown](https://developer.puter.com/tutorials/perplexity-api-pricing/),
  [CostBench](https://costbench.com/software/ai-search-apis/perplexity-sonar-api/)). Every call does
  a live web search and returns citations. ~ $0.006-$0.014 per prompt.
- Gemini with Google Search grounding: grounding fee on top of model tokens (reported ~$0.003+ per
  grounded query) ([eesel](https://eesel.ai/blog/google-gemini-3-pricing)). Verify against Google's
  official pricing page before enabling at scale.
- Estimate: 10 prompts x 2 engines x weekly ~= $1 per tracked brand per month.

**Opportunity.** Including real AI mention tracking in Pro ($19) would undercut every dedicated
tool while AEOCheck keeps its readiness scanner as the "how to fix it" half. This is the single
highest-leverage feature on the roadmap.

### Spec: AI Visibility Tracker (v1)

- Input: a brand (name + domain) and 5-10 buyer prompts. Prompts are suggested from the scanned page
  (title, H1, description) and editable, e.g. "best {category} tools for {audience}".
- For each prompt and engine: ask the engine, record whether the brand is **mentioned** in the
  answer, whether the domain is **cited** as a source, the brand's position among mentioned
  competitors, and the cited URLs.
- Metrics: mention rate, citation rate, share of voice vs competitors named in answers, trend over time.
- Engines v1: Perplexity Sonar (`PERPLEXITY_API_KEY`), Gemini grounded search (`GEMINI_API_KEY`).
  Later: OpenAI Responses API with web search, Google AI Overviews via a SERP API.
- Runs: on demand (rate limited) and weekly via the monitor cron for monitored brands.
- Storage: `ai_visibility_runs` table (additive migration).

**Status:** engine library and admin-only API shipped behind `AI_VISIBILITY_ENABLED` (off by
default). Owner decisions needed before customers see it: which plans include it and how many
prompts/runs, and API keys + budget. See ROADMAP "Owner actions".
