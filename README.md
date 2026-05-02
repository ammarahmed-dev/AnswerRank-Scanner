# AnswerRank Scanner

**AI Visibility Readiness Report Tool** — Instantly analyze any website and see how ready it is for AI search engines, answer engines, and LLM-based discovery.

## What It Does

AnswerRank Scanner fetches real website data, parses the HTML, and generates a structured AI Visibility Readiness Report including:

- **Overall AI Visibility Score** (0–100)
- **Category Scores**: Metadata, Headings, Schema, Content Clarity, AI Answer Readiness, Performance
- **Extracted Page Data**: Title, meta description, H1, schema types, image alt issues, links
- **Entity Map**: Detected brands, business type, target audience, missing entities
- **AI-Powered Recommendations**: High-impact fixes, schema suggestions, FAQ recommendations, final verdict

## How Scoring Works

| Category | Max Points | What's Checked |
|---|---|---|
| Metadata | 15 | Title length, meta description, canonical URL |
| Headings | 15 | Single H1, useful H2s |
| Schema | 20 | JSON-LD presence, useful schema types |
| Content Clarity | 20 | Body text depth, product/audience language |
| AI Answer Readiness | 15 | FAQ content, entity signals, FAQPage schema |
| Performance | 15 | PageSpeed score or fallback heuristics |

**Score Labels**: 85–100 Excellent · 70–84 Strong · 50–69 Needs Work · Below 50 Poor

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Cheerio** — HTML parsing
- **OpenAI GPT-4o-mini** — Structured AI analysis (optional)
- **Google PageSpeed Insights API** — Performance score (optional)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Add API keys (optional)

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
OPENAI_API_KEY=sk-...         # For AI-powered recommendations
GOOGLE_PAGESPEED_API_KEY=...  # For real performance scores
```

> The tool works without any API keys using deterministic fallback analysis.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter any website URL (e.g. `stripe.com`)
2. Click **Generate AI Visibility Report**
3. Wait 10–20 seconds for analysis
4. Review the full report and copy recommendations

## Project Structure

```
app/
  page.tsx                  # Main UI page
  layout.tsx                # Root layout
  globals.css               # Global styles
  api/analyze/route.ts      # POST /api/analyze handler
  components/
    ScoreCircle.tsx          # Animated SVG score ring
    CategoryCard.tsx         # Score category card
    LoadingState.tsx         # Animated loading steps
    ReportSection.tsx        # Full report display
lib/
  scrape.ts                 # URL normalization, HTML fetch, Cheerio parsing
  score.ts                  # Deterministic scoring + fallback analysis
  openai.ts                 # OpenAI GPT-4o-mini structured analysis
  pagespeed.ts              # Google PageSpeed Insights API
types/
  report.ts                 # TypeScript types
```
