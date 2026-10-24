# Database permission correction

Supabase is connected as of 2026-10-25. Read-only inspection can support the remaining database implementation work. Production schema exports, grants, policy snapshots and customer records are not included in this repository change.

## Intended access boundary

Application source uses service-role server APIs for reports, profiles, quotas, audits, monitors, comparisons and contact submissions. Those APIs perform authentication, plan limits and input validation. Browser table access should be limited to waitlist INSERT and public statistics SELECT. The waitlist client uses a minimal insert response and does not request returned rows.

The proposed migration explicitly establishes those browser grants, preserves service-role grants and removes an unnecessary waitlist SELECT policy. Future postgres-owned tables require explicit browser grants. It does not change customer rows, pricing, entitlements or function execution.

## Verification

Six PGlite/Postgres tests build synthetic tables, roles and policies, then execute the actual migration file. They verify anonymous/authenticated insert-only waitlist behavior, duplicates, rejected INSERT RETURNING, denial of direct customer-table and administrative privileges, public statistics reads, service-role privileges and writes, repeatable application and future-table defaults. Fixtures are synthetic and do not reproduce private production metadata.

These tests do not establish compatibility with every live authenticated journey. A complete schema baseline, clean-install/upgrade tests, transaction integration and authenticated production acceptance remain unfinished. Do not blindly replay historical migrations.

## Production status

**Applied and checked on 2026-10-25 after the owner's explicit approval.** The recorded Supabase migration version is 20261024213440; the repository filename matches that history entry. Earlier automatic-review rejection was resolved by the owner's approval.

Catalog checks confirmed the intended browser grants and absence of administrative/direct customer-table privileges. Anonymous Data API reads of private tables were denied with 401; public statistics remained 200. A synthetic anonymous waitlist insert succeeded inside a rolled-back transaction, leaving no test row. Public pages and an existing report remained readable through the application's server API. Security advisors were rechecked.

These checks do not replace full signed-in checkout, monitor, audit and email acceptance journeys. No customer rows were deleted or changed. Live metadata and customer records remain excluded from the repository.

References:

- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/postgres/row-level-security
