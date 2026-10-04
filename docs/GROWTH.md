# Traffic growth plan

Written 2026-10-04. Baseline (GSC, 28 days to Oct 2): 1.9K impressions, 7 clicks, ~25-105 impressions
a day and rising. Almost no external links. The brand query ranks 1; everything else sits on page 2+.
The constraint is distribution, not product: the site has 10 free tools, an audit page and a
scanner, and almost nobody sees them.

## What moves the needle (in order)

1. **Link-worthy original data.** Journalists, newsletters and bloggers cite numbers. The AI readiness
   study (`/research/ai-readiness-study`) is the first piece: 85 well-known sites, reproducible script,
   raw JSON. Repeat quarterly and expand (new categories, change over time) so it keeps earning links.
2. **Free tools that match real queries.** Tools get linked from "best X" lists and tutorials and
   convert well. 10 exist. Add only when GSC or Trends shows demand; do not ship tools for their own sake.
3. **Rank for the long tail first.** Position 11-30 queries ("aeo for saas", "aeo checker") need
   better pages, internal links and a handful of external links, not new pages.
4. **Distribution on communities and directories** (needs the owner's accounts; drafts below).
5. **Referral loops inside the product**: shareable report link, embeddable score badge (backlink per use).

## Done so far
- AI SEO audit landing page and "AI SEO / AI visibility" positioning (broader terms than "AEO").
- 10 free tools, linked from report issues, `/tools`, footer, llms.txt, sitemap.
- Fix Pack in the report, aeo-for-saas refresh, AI readiness study page.

## Next engineering items (ROADMAP Phase 5)
- Embeddable "AI readiness" badge (SVG endpoint + snippet) for sites that score well. Each embed is a link.
- Public, shareable report pages (opt-in, noindex by default) so people can post their score.
- Platform landing pages from real queries: "AEO for Shopify / WordPress / Webflow" (only with accurate, platform-specific steps).
- Study v2: add change-over-time (re-run monthly, keep history in `data/`), more categories.
- Blog hubs next weekend: `how-to-get-cited-by-chatgpt`, `measure-ai-search-traffic` (weekly cap: 2 posts).

## Owner actions that unlock traffic (Claude cannot do these: they need accounts or are outbound posts)
Posting is outbound publishing, so these wait for the owner. Drafts are ready to paste.

1. **Product Hunt / Hacker News / Indie Hackers / Reddit (r/SEO, r/bigseo, r/SaaS, r/webdev)**:
   - Show HN title: "Show HN: I scanned 85 big sites for AI-crawler rules and llms.txt (data + script)"
     Body: what was measured, the three headline numbers from the study page, link to the page and the free tools, state the limits (hand-picked sample).
   - r/SEO: lead with the finding ("65% of the SaaS sites checked publish llms.txt; 0 of 21 media sites do"), not the product; link once.
2. **Directories** (free submissions): AI tool directories, SaaS directories, "SEO tools" lists, G2/Capterra/AlternativeTo listings. Use the one-line pitch: "Free AI SEO audit: scores a URL on 25 signals for ChatGPT, Perplexity and Google AI Overviews."
3. **Outreach** to the people who wrote AEO tool roundups (the "best AEO tools" posts that rank): offer the study data and the free tools for inclusion. Short, specific, one email each.
4. **LinkedIn / X** posts from the founder account: one chart from the study per post.
5. **Google Search Console**: submit `sitemap.xml` again after deploys; request indexing for `/ai-seo-audit`, `/research/ai-readiness-study`, the tool pages.
6. **Vercel Pro** so shipping is not throttled by 100 deployments a day.

## Measure
- Weekly: GSC Overview (queries, pages, `/tools` and `/research` impressions). Targets: 10x impressions in 8 weeks; first 5 referring domains; 100+ tool uses per week.
- Record each experiment's result in docs/CHANGELOG.md.
