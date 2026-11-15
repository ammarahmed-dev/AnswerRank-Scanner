import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { selectGscTopic, previousWindow } from "../lib/select-gsc-topic.mjs";

function withFiles(files, fn) {
  const root = mkdtempSync(join(tmpdir(), "aeocheck-topics-"));
  try {
    for (const slug of files) writeFileSync(join(root, slug + ".mdx"), "---\n---\n");
    return fn(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

const map = {
  pillars: [{ id: "schema", hubSlug: "schema-guide" }, { id: "technical", hubSlug: "tech-guide" }],
  slots: [
    { slug: "schema-guide", pillar: "schema", role: "hub", tier: 1, status: "planned",
      targetQueries: ["schema for ai search", "json-ld for llms"] },
    { slug: "faq-schema-guide", pillar: "schema", role: "spoke", tier: 1, status: "planned",
      targetQueries: ["faq schema validation"] },
    { slug: "meta-guide", pillar: "technical", role: "spoke", tier: 1, status: "planned",
      targetQueries: ["meta tag checker", "check meta tags online"] },
    { slug: "already-published", pillar: "technical", role: "spoke", tier: 1, status: "published",
      targetQueries: ["meta tag checker"] },
  ],
};

test("selects highest evidenced uncovered intent without leaking query rows", () =>
  withFiles(["tech-guide"], (blogDir) => {
    const selected = selectGscTopic({ map, blogDir,
      currentRows: [
        { keys: ["meta tag checker"], impressions: 40 },
        { keys: ["schema for ai search"], impressions: 15 },
        { keys: ["unrelated query"], impressions: 2000 },
      ],
      previousRows: [{ keys: ["meta tag checker"], impressions: 10 }],
    });
    assert.equal(selected?.slug, "meta-guide");
    assert.equal(selected?.matchedImpressions, 40);
    assert.equal(JSON.stringify(selected).includes("meta tag checker"), false);
  }));

test("skips already existing posts and spokes without a published hub", () =>
  withFiles(["meta-guide"], (blogDir) => {
    const selected = selectGscTopic({ map, blogDir,
      currentRows: [{ keys: ["meta tag checker"], impressions: 500 },
        { keys: ["faq schema validation"], impressions: 400 },
        { keys: ["schema for ai search"], impressions: 7 }],
    });
    assert.equal(selected?.slug, "schema-guide");
  }));

test("does not draft without sufficient first-party evidence", () =>
  withFiles(["tech-guide"], (blogDir) => {
    assert.equal(selectGscTopic({ map, blogDir,
      currentRows: [{ keys: ["meta tag checker"], impressions: 3 }] }), null);
  }));

test("previous date window is consecutive and same length", () => {
  assert.deepEqual(previousWindow({ startDate: "2026-10-16", endDate: "2026-11-12" }),
    { startDate: "2026-09-18", endDate: "2026-10-15" });
});
