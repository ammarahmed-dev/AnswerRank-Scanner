-- Retired incomplete setup entrypoint. See supabase/README.md and
-- supabase/install-manifest.json for the tested fresh-install recipe.
-- Existing databases require reviewed incremental migrations, never bootstrap.
DO $$ BEGIN
  RAISE EXCEPTION 'Retired schema entrypoint: follow supabase/README.md; do not bootstrap an existing database';
END $$;
