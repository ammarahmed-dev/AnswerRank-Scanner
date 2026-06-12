# AEOCheck - Topical Map & Full SEO Automation Architecture

Goal: make aeocheck.co the topically-complete authority on AEO/GEO, with content production, optimization, and monitoring running on autopilot via GitHub Actions + existing APIs (zero new recurring cost).

---

## PART 1: TOPICAL MAP

Architecture: hub-and-spoke. Each pillar is a long-form hub page (2,500-4,000 words, FAQPage + Article schema). Spokes are 1,200-2,000 word cluster posts that link UP to the pillar and ACROSS to 2-3 siblings. Every spoke links to the scanner with contextual anchors.

Priority tiers:
- T1 = publish first (GSC striking-distance or high commercial intent)
- T2 = core coverage
- T3 = long-tail / programmatic

### PILLAR 1: Answer Engine Optimization (the entity hub)
Hub: `/blog/what-is-answer-engine-optimization` - "What Is AEO? The Complete Guide to Answer Engine Optimization (2026)"

| Slug | Title | Tier |
|---|---|---|
| /blog/aeo-vs-seo | AEO vs SEO: What's Different and What Still Matters | T1 |
| /blog/aeo-vs-geo | AEO vs GEO: Are They the Same Thing? | T1 |
| /blog/aeo-checklist | The Complete AEO Checklist: 25 Checks Before You Publish | T1 |
| /blog/how-ai-search-engines-work | How AI Search Engines Choose What to Cite | T2 |
| /blog/aeo-ranking-factors | AEO Ranking Factors: What Actually Influences AI Citations | T2 |
| /blog/answer-engine-optimization-cost | How Much Does AEO Cost? (DIY vs Agency vs Tools) | T2 |
| /blog/aeo-mistakes | 12 AEO Mistakes That Keep AI Engines From Citing You | T3 |
| /blog/aeo-statistics | AEO Statistics 2026: AI Search Adoption Data | T3 (linkable asset) |

### PILLAR 2: ChatGPT Visibility
Hub: `/blog/how-to-get-cited-by-chatgpt` - "How to Get Your Website Cited by ChatGPT"
(Existing: chatgpt-product-recommendations - link it into this cluster.)

| Slug | Title | Tier |
|---|---|---|
| /blog/chatgpt-search-how-it-works | How ChatGPT Search Picks Its Sources | T1 |
| /blog/oai-searchbot-crawler | OAI-SearchBot: How to Verify ChatGPT Is Crawling Your Site | T1 |
| /blog/chatgpt-shopping-visibility | ChatGPT Shopping: Getting Your Products Listed | T2 |
| /blog/why-chatgpt-doesnt-mention-my-brand | Why ChatGPT Doesn't Mention Your Brand (And How to Fix It) | T2 |
| /blog/chatgpt-traffic-ga4 | How to Track ChatGPT Referral Traffic in GA4 | T1 |

### PILLAR 3: Perplexity Visibility
Hub: `/blog/perplexity-seo-guide` - "Perplexity SEO: How to Become a Cited Source"

| Slug | Title | Tier |
|---|---|---|
| /blog/perplexitybot-crawler | PerplexityBot: Crawl Behavior and robots.txt Setup | T2 |
| /blog/perplexity-vs-google | Perplexity vs Google: Where Should You Focus? | T3 |
| /blog/perplexity-citation-patterns | What Kind of Pages Perplexity Actually Cites (Data Study) | T2 (linkable asset) |

### PILLAR 4: Google AI Overviews & AI Mode
Hub: existing `/blog/google-ai-overviews-organic-traffic` - promote to hub, expand to 3k+ words.

| Slug | Title | Tier |
|---|---|---|
| /blog/google-ai-mode-optimization | Optimizing for Google AI Mode | T1 |
| /blog/rank-in-ai-overviews | How to Get Featured in Google AI Overviews | T1 |
| /blog/ai-overviews-ctr-impact | AI Overviews and CTR: What the Data Shows | T2 |
| /blog/google-extended-robots | Google-Extended: Should You Block It? | T3 |

### PILLAR 5: Schema & Structured Data for AI
Hub: `/blog/schema-for-ai-search` - "Structured Data for AI Search: The Complete Schema Guide"

| Slug | Title | Tier |
|---|---|---|
| /blog/faq-schema-ai-search | Does FAQ Schema Still Matter for AI Search? | T1 |
| /blog/organization-schema-entity | Organization Schema: Building Entity Clarity for AI | T2 |
| /blog/article-schema-guide | Article Schema for AI Citations: Setup Guide | T2 |
| /blog/breadcrumb-schema | BreadcrumbList Schema and AI Crawlers | T3 |
| /blog/json-ld-vs-microdata | JSON-LD vs Microdata for AI Engines | T3 |
| /blog/speakable-schema | Speakable Schema: Worth Implementing? | T3 |

### PILLAR 6: Technical AI Readiness
Hub: `/blog/technical-aeo-guide` - "Technical AEO: Making Your Site Machine-Readable"

| Slug | Title | Tier |
|---|---|---|
| /blog/llms-txt-guide | llms.txt: What It Is and How to Create One | T1 |
| /blog/llms-txt-generator | Free llms.txt Generator (+ template) | T1 (tool page) |
| /blog/ai-crawlers-list | Every AI Crawler in 2026: User Agents and What They Do | T1 (linkable asset) |
| /blog/robots-txt-ai-crawlers | robots.txt for AI Crawlers: Allow or Block? | T2 |
| /blog/javascript-rendering-ai-crawlers | Do AI Crawlers Render JavaScript? (Test Results) | T2 |
| /blog/server-side-rendering-aeo | SSR vs CSR for AI Search Visibility | T3 |

### PILLAR 7: Platform Guides (your unfair advantage)
Hub: `/blog/aeo-by-platform` - "AEO Setup Guides by Platform"

| Slug | Title | Tier |
|---|---|---|
| /blog/webflow-aeo-guide | Webflow AEO: Complete AI Search Setup Guide | T1 (you ARE the authority) |
| /blog/webflow-schema-markup | Adding Schema Markup in Webflow (No Plugins) | T1 |
| /blog/wordpress-aeo-guide | WordPress AEO Guide | T2 |
| /blog/shopify-aeo-guide | Shopify AEO: Product Visibility in AI Search | T2 |
| /blog/nextjs-aeo-guide | Next.js AEO: Metadata API, JSON-LD, llms.txt | T2 |
| /blog/framer-aeo-guide | Framer AEO Guide | T3 |
| /blog/squarespace-aeo-guide | Squarespace AEO Guide | T3 |

### PILLAR 8: Personas & Industries
Hub: existing `/blog/aeo-for-saas` - promote to hub.

| Slug | Title | Tier |
|---|---|---|
| /blog/aeo-for-agencies | AEO for Agencies: Productizing AI Search Audits | T1 (sells Agency plan) |
| /blog/aeo-for-ecommerce | AEO for Ecommerce | T2 |
| /blog/aeo-for-local-business | AEO for Local Businesses | T2 |
| /blog/aeo-for-b2b | AEO for B2B: The New Demand Gen Channel | T3 |
| /blog/aeo-client-reporting | How to Present AEO Audits to Clients (+ template) | T2 (sells PDF reports) |

### PILLAR 9: Measurement & Monitoring
Hub: `/blog/measure-ai-search-traffic` - "How to Measure AI Search Traffic and Citations"

| Slug | Title | Tier |
|---|---|---|
| /blog/ai-referral-traffic-ga4 | Tracking AI Referrals in GA4 (regex + setup) | T1 |
| /blog/ai-crawler-log-analysis | Reading Your Server Logs for AI Crawler Activity | T2 |
| /blog/ai-share-of-voice | AI Share of Voice: Tracking Brand Mentions Across Engines | T2 |
| /blog/aeo-kpis | AEO KPIs: What to Report Beyond Rankings | T3 |

### PILLAR 10: Tools & Comparisons (commercial layer)
Hub: `/blog/best-aeo-tools` - "Best AEO Tools in 2026 (Honest Comparison)"

| Slug | Title | Tier |
|---|---|---|
| /vs/* expansion | vs Otterly, Semrush AI, Peec, Profound (existing) + vs Writesonic GEO, vs Goodie, vs Scrunch, vs Athena | T2 |
| /alternatives/otterly-alternatives | Otterly Alternatives | T2 |
| /alternatives/profound-alternatives | Profound Alternatives (free + cheap options) | T1 |
| /blog/free-aeo-tools | 9 Free AEO Tools That Actually Work | T1 |
| /blog/aeo-audit-template | Free AEO Audit Template (Notion/Sheets) | T2 (lead magnet) |

### PROGRAMMATIC LAYERS (T3, generated, indexed selectively)
1. **Glossary**: `/glossary/[term]` - 40-60 terms (answer engine, AI Overview, citation rate, llms.txt, grounding, RAG, entity SEO, etc.). DefinedTerm schema. Massive internal-link surface.
2. **Benchmark pages from your scan database** (the moat - nobody else has this data): `/benchmarks/[industry]` - "Average AEO Score for SaaS Websites" etc., auto-generated from anonymized aggregate scan data, refreshed monthly by a cron Action.
3. **AI crawler directory**: `/crawlers/[bot-name]` - one page per crawler (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, Bytespider...) with UA string, robots.txt snippet, IP verification. These rank fast and earn links.

Internal linking rules (enforced by automation, Part 2):
- Every spoke → its hub (exact-ish anchor) + 2-3 siblings + 1 CTA to /#scanner or /sample-report
- Every hub → all its spokes + 1-2 adjacent hubs
- No orphan pages; max click depth 3 from homepage

---

## PART 2: AUTOMATION ARCHITECTURE

Builds on the existing kit (blog generation, CI, weekly SEO health check). Six new layers:

### Layer 1 - Topical map as machine-readable queue
`content/topical-map.json`: every slot above as an object - `{slug, title, pillar, tier, status, targetQueries[], internalLinks[], schemaTypes[]}`.
- Weekly Action picks the highest-priority `status: "planned"` slot, generates the MDX draft (Claude API) with frontmatter, FAQ block, JSON-LD, and the required internal links pre-inserted, then opens a PR.
- You review/merge - human-in-the-loop keeps quality at "industry level" instead of AI-slop level. Merge cadence: 2-3/week.

### Layer 2 - GSC feedback loop (the part most people never automate)
Weekly Action hits the GSC API:
1. Pull all queries + pages, 28-day window.
2. **Striking distance**: queries at position 4-20 with impressions > threshold → open a GitHub issue per page: "add section answering [query], update title".
3. **Decay detection**: pages with clicks down >30% vs prior period → push to refresh queue (`status: "refresh"` in topical-map.json).
4. **Gap mining**: queries you get impressions for but have no dedicated page → auto-append as new T3 slots in the map.
This makes the topical map self-expanding from real demand data.

### Layer 3 - On-publish automation (per merge to main)
- Auto-inject Article + FAQPage + BreadcrumbList JSON-LD from frontmatter (build step, not per-post manual work).
- Regenerate sitemap.xml + llms.txt (llms.txt should list new posts - dogfooding).
- **IndexNow ping** (Bing/Yandex, instant) + GSC sitemap resubmission.
- Regenerate /api/og image for the post.
- Internal-link linter: CI fails the PR if hub/sibling links from topical-map.json are missing, or if the post creates an orphan.

### Layer 4 - Programmatic generation crons
- Monthly: regenerate /benchmarks/* from Supabase aggregate scan stats (anonymized). Auto-update "last updated" + dataset size ("Based on N scans").
- Quarterly: regenerate the AEO Statistics post and the AI Crawlers list (Claude API + web search tool for fresh data, PR for review).

### Layer 5 - Self-monitoring (dogfood your own product)
- Weekly: run AEOCheck's own scanner against your 10 newest posts; fail the health-check Action if any scores < 90.
- Weekly: hit your Monitor feature for "aeocheck" brand mentions across engines; log citation count over time to a Supabase table → this becomes a public "our AI visibility over time" page (great trust content).

### Layer 6 - Distribution automation (off-page)
- On publish: auto-draft (not auto-post) a LinkedIn version and a Substack cross-post into a drafts folder - you approve and ship. Keeps E-E-A-T human.
- Quarterly data study from scan DB ("We analyzed N,000 websites: X% are invisible to ChatGPT") → this is your link-earning engine. One good study outperforms 50 directory submissions.

### Cadence summary
| Frequency | Job |
|---|---|
| On PR | Internal-link lint, schema validation, Lighthouse/AEO self-scan |
| On merge | Schema inject, sitemap + llms.txt regen, IndexNow, OG image |
| Weekly | Draft next topical-map slot, GSC striking-distance + decay report, self-scan top posts |
| Monthly | Benchmarks regen, gap-mined slots added to map |
| Quarterly | Stats post refresh, crawler list refresh, data study draft |

---

## PART 3: 90-DAY SEQUENCE

**Weeks 1-2**: Ship topical-map.json + the 10 hub pages (skeletal hubs are fine; expand later). Hubs first so every future spoke has a parent. Add glossary scaffold.
**Weeks 3-6**: All T1 spokes (~16 posts at 3/week via the pipeline). Wire Layer 2 (GSC loop) and Layer 3 (on-publish).
**Weeks 7-10**: T2 spokes + /benchmarks/ programmatic layer + crawler directory. First data study.
**Weeks 11-13**: T3 + gap-mined posts, /alternatives/ pages, refresh cycle kicks in on the oldest content.

Success metrics: indexed pages, queries with impressions (breadth = topical authority signal), striking-distance conversions to top-3, AI citation count from your own Monitor, and signups attributed to blog landing pages.
