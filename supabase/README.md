# Database installation and upgrades

The old root `supabase-schema.sql` is retired and deliberately fails with a pointer here. It created only three incomplete tables and could not reproduce the current application database. No production migration is needed for this repository-only setup correction.

## Fresh, unexposed database

Use a disposable Supabase development project or a local Supabase stack. Supabase supplies `auth.users`, `auth.uid()` and the `anon`, `authenticated` and `service_role` roles. Do not recreate managed auth objects in a hosted project. Tests provide minimal synthetic substitutes, not a copy of the Supabase Auth service.

Keep the database disconnected from the application and Data API clients until the entire recipe passes. Historical migrations temporarily contain broader policies before later permission corrections, so individual intermediate states are not a supported deployment.

Apply **exactly once**, in the explicit order in [install-manifest.json](install-manifest.json):

1. [bootstrap/base.sql](bootstrap/base.sql): missing historical prerequisites, including billing/email columns, report retest fields, webhook receipts, contact storage and public stats. It rejects any existing application table and uses a transaction so a failed bootstrap cannot partially overwrite an existing setup.
2. Every listed file from `migrations/`, in manifest order, without rewriting or skipping the historical SQL. The original `pgcrypto` extension statement runs too. Later migrations add one-time fields, report timestamps, full comparison storage, methodology and transactional RPCs.
3. [bootstrap/finalize.sql](bootstrap/finalize.sql): explicit service grants omitted by historical migrations and the final browser boundary. Server APIs can use their required tables/RPCs without relying on Supabase's automatic grants. Browser access is only waitlist INSERT and public stats SELECT. Fresh-install table ACLs are reset explicitly so both broad automatic defaults and opt-in defaults converge to required application access. No default privileges are broadened; AI observations receive no service UPDATE/DELETE and no table administrative rights are required.

4. [bootstrap/verify.sql](bootstrap/verify.sql): read-only catalog assertions fail the recipe for missing RLS tables, unexpected browser/service grants or missing service-only invoker RPCs. No customer rows are read. A failed check requires investigation before exposing the database.

The recipe contains no customer/analytics export, paid-provider call or fabricated production seed count. `scripts/lib/database-install.mjs` returns the ordered files/SQL for tooling and tests; it never connects to or applies SQL on a database. There is intentionally no automatic production bootstrap command.

Verify locally with `npx vitest run tests/database-install.test.ts`. It executes the real SQL using PGlite and pgcrypto, tests both broad and opt-in default-grant starting states, twelve tables/RLS/browser grants, all eight application RPC permissions, and real quota/billing/report/monitor/audit operations. Synthetic historical rows survive the incremental chain. PGlite uses a single connection: this does not prove multi-connection contention, hosted Auth/Data API behavior or production upgrade safety.

## Existing database

**Never run bootstrap/base.sql, bootstrap/finalize.sql or the complete manifest on an existing database.** Some historical migrations use `CREATE FUNCTION`/`CREATE POLICY` and are intentionally not replay-safe. Identify already-applied SQL and inspect current catalog definitions/privileges before planning individual upgrades. Do not assume a filename or an empty migration-history table proves a migration is absent.

The upgrade fixture starts from the reconstructed historical prerequisites plus pre-24-October migrations, inserts synthetic saved records, then applies the later real migration chain. It is useful regression coverage for that known starting state, not an automatic repair of every historical installation.

Mixed eight/fourteen-digit migration prefixes predate this recipe. The manifest preserves their reviewed order; do not rename published files or treat `supabase db reset` as equivalent to this prerequisite-aware recipe. Production's reviewed AI visibility grant repair is already applied as history version `20261027002724`, name `restore_ai_visibility_server_access`; the CLI repository file is `20261027002206_restore_ai_visibility_server_access.sql`. They have the same reviewed content. No history rewrite or second application is needed.

## Reconciliation and remaining limits

The missing prerequisite columns/defaults/types/FKs were checked against live catalog metadata on 27 October 2026, without reading customer rows. The fresh recipe preserves effective application access; it does not copy unused legacy policies or extra service administrative grants. All twelve application tables have RLS. The service role bypasses RLS by design, so server ownership and entitlement checks remain required.

Existing FK behavior is preserved: profiles/monitors/comparisons/AI observations cascade with their referenced auth user; reports retain content with a null owner; audit ownership historically has no FK. This is a description, not an approved deletion/retention policy. Export/deletion/share-link decisions, audit orphans, full hosted clean/upgrade acceptance and true concurrent database tests remain open under A10/A16.

When adding a migration, review its prerequisites and permissions, update the manifest and run the install/upgrade tests. Do not add uninspected production DDL or use the fresh bootstrap to bypass upgrade review.
