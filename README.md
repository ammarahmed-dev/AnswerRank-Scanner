# AEOCheck

AEOCheck is a one-page SaaS MVP that scans a public website URL and generates an AI Visibility Readiness Report. It is designed for demos: no auth, no database, and no Stripe integration yet.

## What It Does

- Scores a page from 0-100 for AI visibility readiness
- Extracts title, meta description, canonical URL, headings, schema, images, and links
- Checks JSON-LD schema and answer-readiness signals
- Generates high-impact recommendations and suggested FAQs
- Shows a locked Pro Report teaser with an "Unlock Full Report - $9" button

## Free Report Includes

- Overall score
- Basic category scores
- Extracted metadata
- Schema found
- Top 3 high-impact fixes
- Recommended FAQs
- Final verdict
- Copy recommendations action
- Scan another URL action

## Pro Teaser Includes

The Pro Report section is intentionally locked for now. The upgrade button only shows:

```text
Stripe checkout will be connected in the next step.
```

It teases the future paid report:

- Full AI search breakdown
- Competitor/entity comparison
- Full schema recommendations
- 10 recommended FAQs
- Exportable PDF report
- Priority implementation checklist

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Cheerio for HTML parsing
- OpenAI GPT-4o-mini for optional AI analysis
- Google PageSpeed Insights API for optional performance scoring

## Environment Variables

Create `.env.local` from `.env.example`:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GOOGLE_PAGESPEED_API_KEY=
```

All keys are optional. The app works without keys using deterministic fallback scoring and recommendations. Add `OPENAI_API_KEY` for AI-powered recommendations, or `GEMINI_API_KEY` as a fallback AI provider. When both AI keys are set, OpenAI is used first. Add `GOOGLE_PAGESPEED_API_KEY` for real PageSpeed performance scores. Each generated report shows whether it used OpenAI/Gemini, Google PageSpeed, or fallback mode.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test URLs

Use these demo URLs:

- `https://anthropic.com`
- `https://linear.app`
- `https://shopify.com`

## Project Structure

```text
app/
  page.tsx
  layout.tsx
  globals.css
  api/analyze/route.ts
  components/
    CategoryCard.tsx
    LoadingState.tsx
    ReportSection.tsx
    ScoreCircle.tsx
lib/
  openai.ts
  pagespeed.ts
  score.ts
  scrape.ts
types/
  report.ts
```

## Notes

- Only public `http` and `https` URLs are supported.
- Localhost and private-network URLs are blocked by validation.
- Some sites may block server-side fetches; the API returns a clear blocked-site message in that case.
- Stripe is not implemented yet by design.


