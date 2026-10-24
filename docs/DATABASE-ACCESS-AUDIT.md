# Database permission correction

Supabase is connected as of 2026-10-25. Read-only inspection can support the remaining database implementation work. Production schema exports, grants, policy snapshots and customer records are not included in this repository change.

## Intended access boundary

Application source uses service-role server APIs for reports, profiles, quotas, audits, monitors, comparisons and contact submissions. Those APIs perform authentication, plan limits and input validation. Browser table access should be limited to waitlist INSERT and public statistics SELECT. The waitlist client uses a minimal insert response and does not request returned rows.

The proposed migration explicitly establishes those browser grants, preserves service-role grants and removes an unnecessary waitlist SELECT policy. Future postgres-owned tables require explicit browser grants. It does not change customer rows, pricing, entitlements or function execution.

## Verification

Six PGlite/Postgres tests build synthetic tables, roles and policies, then execute the actual migration file. They verify anonymous/authenticated insert-only waitlist behavior, duplicates, rejected INSERT RETURNING, denial of direct customer-table and administrative privileges, public statistics reads, service-role privileges and writes, repeatable application and future-table defaults. Fixtures are synthetic and do not reproduce private production metadata.

These tests do not establish compatibility with every live authenticated journey. A complete schema baseline, clean-install/upgrade tests, transaction integration and authenticated production acceptance remain unfinished. Do not blindly replay historical migrations.

## Production status

**Not applied.** Automatic approval review rejected the production privilege changes because live customer-flow compatibility has not been established. Production permissions remain unchanged. No indirect SQL execution was attempted after rejection.

The migration is ready for review. Applying it to production requires approval, followed by catalog verification, read-only API denial checks, signed-in server journeys, a controlled waitlist submission and security advisors. Do not publish live metadata or customer rows as verification evidence.

References:

- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/postgres/row-level-security
