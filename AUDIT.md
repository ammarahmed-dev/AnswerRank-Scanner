# AEOCheck Product Audit
**Date:** 2026-06-25  
**Scope:** Full codebase review - no live changes made during this pass  
**Auditor:** Claude Code

---

## Test Accounts Created

| Email | Plan |
|-------|------|
| onetime@test.aeocheck.co | **free** (stuck - see Critical #1) |
| pro@test.aeocheck.co | **pro** |

> Passwords removed from this file (2026-10-03). They remain in git history: rotate or delete these accounts.

> NOTE: The onetime account is currently at `free` because the DB constraint blocks `onetime` plan. Fix Critical #1 first, then re-run `node scripts/create-test-accounts.mjs`.

---

## User Flow Trace

### 1. Landing → Sign Up → First Scan (free user)

- Landing page has a working homepage scanner powered by SSE
- Sign up (`/signup`) uses Google OAuth or email/password via Supabase auth
- Email confirmation is required for email sign-ups - user is told to check inbox, no redirect confusion
- On first sign-in, `auth-server.ts` creates a profile (plan=free) and triggers welcome email
- **Welcome email never sends** - `RESEND_API_KEY` is empty AND `INTERNAL_API_SECRET` is not set (double failure)
- First scan works for free users (3 or 5 scans/month - inconsistency noted)
- After scan, user is redirected to `/report?id=...` if logged in, `/report?url=...` if guest

### 2. Free User Hits Limit → Upgrade → Checkout

- Scan limit returns HTTP 429 with `type: "limit_reached"` 
- Homepage shows a modal for free users, raw error message for guests
- Dashboard correctly shows usage meter and "View pricing" link
- Pricing page is clean, CTAs work, feature comparison table is present
- `UpgradeButton` redirects to `/login` if not authenticated - correct
- Checkout calls `/api/checkout` which creates a Lemon Squeezy checkout session
- LEMONSQUEEZY env vars (`VARIANT_ONETIME`, `VARIANT_PRO`, `VARIANT_AGENCY`) not in `.env.local` - checkout returns 503 locally
- Post-checkout webhook fires `order_created` → `profiles_plan_check` constraint **silently rejects** `plan=onetime` - user never gets upgraded

### 3. Pro User Dashboard → Scan → Report → Compare

- Dashboard shows plan, usage, recent scans/audits cleanly
- Sidebar nav works: Overview, Scans, Audits, Settings, Admin (for admin)
- Empty state banner ("Scan your first URL") shows correctly for new users
- Scan page: SSE-based, progress steps render correctly
- Report page: loads from DB or sessionStorage, renders well
- Compare: exists at `/compare`, requires login, saves history for pro
- Retest button works for pro users on both scan and report pages
- **onetime users can't retest from scan page** - `isPro` in ScanClient excludes `onetime` plan

### 4. Email Flows

| Email | Route | Status |
|-------|-------|--------|
| Welcome | `POST /api/emails/welcome` | BROKEN - `RESEND_API_KEY` empty, `INTERNAL_API_SECRET` unset |
| Follow-up (3-day) | `GET /api/cron/followup-email` | BROKEN - `RESEND_API_KEY` empty; also UNPROTECTED - `CRON_SECRET` not set |
| Payment confirmation | Lemon Squeezy native | Sends LS receipt; no custom AEOCheck email |
| Limit-hit | Not implemented | No email when user hits scan limit |

---

## Findings by Area

### Onboarding

- **What works:** Login/signup page is clean, two-panel split layout, Google OAuth + email, friendly error messages, redirect after auth
- **What's broken:** No welcome email ever arrives (double env var failure); users land on dashboard with no email from the product
- **What exists but adds no value:** `/upgrade/success` page with `session_id` logic - Lemon Squeezy checkout redirects to `/dashboard?upgraded=1`, not to this page; the page calls `/api/checkout/confirm` which does not exist

### Dashboard

- **What works:** Overview tab is clear; plan/usage/scan meter visible; empty state "Scan your first URL" banner present; audit + monitor progress cards; mobile bottom nav with fixed positioning
- **What's broken:** `console.log("[dashboard] auditCountThisMonth:", ...)` leaks to browser console in production
- **What adds no value:** Admin tab shows only a single link to `/admin` - could just be a nav item

### Scan Results Page

- **What works:** Full score breakdown, category scores, AI insights panel, schema recommendations, issue list with priority/effort tags, PDF download for pro
- **What's broken:** Sharing a `/report?url=...` link with someone else shows "Network error" because `runScan()` in ReportClient calls `res.json()` on an SSE stream (scan API returns `text/event-stream`, not JSON)
- **Medium:** onetime users cannot retest from the Scan page (isPro excludes onetime in ScanClient but includes it in ReportSectionNew)

### Pricing Page

- **What works:** 4 plan cards, feature comparison table, FAQ, CTA. Current plan detection and "Downgrade" state handled. Popular badge on Pro.
- **What's broken:** None observed
- **Mild inconsistency:** Free plan shows "3 scans per month" in pricing FAQ but `FREE_MONTHLY_SCAN_LIMIT=5` in env

### Error States

- **What works:** Global `error.tsx` boundary with "Try again" / "Back to home" buttons; report page has inline error banner with clear message; scan rate limit returns friendly error modal on homepage
- **What's broken:** Error on checkout failure is silent - `UpgradeButton` logs to console but shows no UI error message to the user when checkout creation fails
- **Missing:** No retry UI on report page error (user must navigate away manually)

### Mobile

- **What works:** Auth page is responsive; dashboard has bottom nav bar for mobile; pricing cards use `auto-fit minmax` grid
- **Likely issues (not confirmed via browser):** Dashboard 3-column grid (`grid3`) uses inline style without breakpoints - on mobile may overflow; bottom nav has `z-index: 9999` which is fine but `height: 64px` with no `padding-bottom` on content below it
- **Low:** Dashboard sidebar visible on mobile at the same time as bottom nav (sidebar is likely hidden via CSS class)

### Performance

- **What works:** SSE streaming means the scan UI stays responsive; result pages are lightweight
- **What's heavy:** `ReportSectionNew.tsx` is a massive client component (full report renderer) - likely no code splitting; `PrintLayout` is dynamically imported (`next/dynamic`) which is correct
- **Low:** `app/components/AnimatedProductDemo.tsx` and `TestimonialsSection.tsx` load inline - if heavy, they'll impact LCP

### Copy

- **Debug string in production:** `console.log("[dashboard] auditCountThisMonth:", ...)` visible in browser devtools
- **Stale copy:** Welcome email template says "3 scans per month" but env says 5
- **Inconsistency:** Pricing FAQ says "3 scans" for free, dashboard description says "3 scans per month included" but actual limit is 5
- **Good:** No lorem ipsum or obvious placeholder text found

### Dead Pages / Unused Routes

- `/upgrade/success` - dead (LS redirects to /dashboard)
- `/upgrade/cancel` - check if linked anywhere (not observed in nav flows)
- `/sample-report` - live, intentional
- `/vs/[competitor]` - comparison landing page, functional

### Console Errors / TypeScript Warnings

- `console.log("[dashboard] auditCountThisMonth:", ...)` - intentional debug, should be removed
- TypeScript check not run in this audit pass - run `npx tsc --noEmit` before shipping

---

## Prioritized Fix List

```
[ CRITICAL ] Payments - profiles_plan_check DB constraint missing 'onetime' - run migration 20260625_fix_plan_check_constraint.sql in Supabase SQL editor
[ CRITICAL ] Report sharing - ReportClient.runScan() calls res.json() on SSE stream - replace with SSE reader (same as HomePageClient)
[ HIGH     ] Emails - RESEND_API_KEY is empty and INTERNAL_API_SECRET not set - no transactional emails send at all; add both env vars
[ HIGH     ] Cron security - CRON_SECRET not set - /api/cron/followup-email is publicly callable; add CRON_SECRET to env + Vercel config
[ HIGH     ] Welcome email copy stale - hardcodes "3 scans per month" but FREE_MONTHLY_SCAN_LIMIT=5 - fix to use env var or align limits
[ HIGH     ] Debug log in production - console.log("[dashboard] auditCountThisMonth:...") in DashboardClient.tsx:152 - remove it
[ HIGH     ] Checkout failure silent - UpgradeButton silently fails if /api/checkout returns error - show user-facing error message
[ MEDIUM   ] /upgrade/success is dead - LS redirects to /dashboard?upgraded=1, not to /upgrade/success - remove or wire up correctly
[ MEDIUM   ] onetime retest - ScanClient isPro excludes onetime plan users from retest button - add onetime to isPro check in ScanClient
[ MEDIUM   ] Error state on report page - no retry button; user must navigate away manually on scan/load error - add retry CTA
[ MEDIUM   ] Pricing copy vs env - FAQ and dashboard show "3 scans/month" free but env is 5 - align copy with FREE_MONTHLY_SCAN_LIMIT
[ LOW      ] /upgrade/cancel page - not linked in checkout flow; may be leftover - verify and remove if unused
[ LOW      ] Dashboard mobile - db-grid-3 inline style has no mobile breakpoint - verify 3-col grid collapses on small screens
[ LOW      ] followup email "87/100" stat is hardcoded and fictional - replace with real stat or remove
```

---

## Summary

The core product (scan → score → report → dashboard) works end-to-end for logged-in users. Two revenue-critical bugs exist: one-time purchases never upgrade the user (DB constraint), and the payment webhook would silently fail. Email is completely dark (both env vars missing). The report-sharing URL is broken for anyone who opens it fresh (not from the same session). Fix the Critical and High items before scaling.
