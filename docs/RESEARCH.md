# Research notes

Market and product research that feeds `docs/ROADMAP.md`. Newest first. Cite sources.

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
