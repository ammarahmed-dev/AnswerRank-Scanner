// Retired: this entrypoint previously wrote private GSC metrics into tracked reports,
// modified the public content map and fed a public issue. Never restore those effects.
// Use the reviewed read-only GSC Overview workflow; keep its output private.
console.error("GSC feedback publication is retired. Use the read-only GSC Overview diagnostic.");
process.exitCode = 1;
