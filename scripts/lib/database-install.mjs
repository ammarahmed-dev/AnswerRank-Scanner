import { readFileSync } from "node:fs";

const root = new URL("../../supabase/", import.meta.url);
export const installManifest = JSON.parse(readFileSync(new URL("install-manifest.json", root), "utf8"));

/** Offline recipe only: returns files/SQL, never connects or applies to a database. */
export function databaseInstallSteps() {
  const paths = [installManifest.base, ...installManifest.migrations.map(name => `migrations/${name}`), installManifest.finalize, installManifest.verify];
  return paths.map(path => ({ path, sql: readFileSync(new URL(path, root), "utf8") }));
}
