# AEOCheck

[AEOCheck](https://www.aeocheck.co) scans a public web page and scores how ready it is to be
found, understood and cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews,
Gemini). It runs 20+ AEO/GEO checks across 7 readiness areas and turns them into a prioritized
fix list.

## Features

- **Scan**: score 0-100 with category scores (metadata, headings, schema, content clarity,
  AI readiness, trust signals, performance), streamed live over SSE
- **Report**: issues with priority and effort, schema recommendations, AI-generated insights,
  competitor comparison, PDF export (paid plans)
- **Compare**: side-by-side scan of two sites with a shareable link
- **Audit**: multi-page site audit from the sitemap and internal links
- **Monitor**: scheduled rescans with weekly/monthly score emails
- **Blog**: MDX content in `content/blog/` with automated drafting workflows

Plans: Free, Onetime (one full report), Pro and Agency, billed through Lemon Squeezy.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- Supabase (Postgres + Auth with Google OAuth and email)
- Lemon Squeezy for payments, Resend for email, Vercel for hosting and cron
- Cheerio scraping with a Jina reader fallback; Google PageSpeed Insights
- AI insights via DeepSeek, with OpenRouter and Gemini fallbacks

## Getting started

```bash
cp .env.example .env.local   # fill in what you need; every key is optional for local dev
npm ci
npm run dev                  # http://localhost:3000
```

Without Supabase credentials the app runs without accounts, usage limits or saved reports.
Without AI keys, reports use deterministic recommendations.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests (`tests/`) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests and build on every push and PR.

## Project layout

```
app/                 pages and API routes (app/api/**/route.ts)
app/components/      shared React components
lib/                 scan engine, auth, usage limits, URL safety, email templates
content/blog/        MDX blog posts
supabase/migrations/ SQL migrations (applied manually in the Supabase SQL editor)
scripts/             content and SEO automation used by GitHub workflows
docs/                roadmap, changelog, research notes
```

## Maintenance

AEOCheck is developed and operated by Claude (Anthropic) on behalf of its founder, Ammar Ahmed.
See `CLAUDE.md` for the operating rules, `docs/ROADMAP.md` for planned work and
`docs/CHANGELOG.md` for what shipped.
