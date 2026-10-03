# Research notes

Market and product research that feeds `docs/ROADMAP.md`. Newest first. Cite sources.

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
