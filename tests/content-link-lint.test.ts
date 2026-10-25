import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function lint(content: string) {
  const dir = mkdtempSync(join(tmpdir(), "aeo-links-"));
  dirs.push(dir);
  writeFileSync(join(dir, "free-aeo-checker.mdx"), content);
  return spawnSync(process.execPath, ["scripts/link-lint.mjs"], {
    encoding: "utf8", env: { ...process.env, BLOG_DIR: dir, STRICT: "1" },
  });
}
describe("canonical tools hub link enforcement", () => {
  it("accepts a direct canonical hub and scanner link", () => {
    expect(lint("[Guide](/blog/best-aeo-tools-ai-search-visibility) [Scan](/#scanner)").status).toBe(0);
  });
  it("rejects the old redirect link as the required canonical hub", () => {
    const result = lint("[Old guide](/blog/best-aeo-tools) [Scan](/#scanner)");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("missing link to pillar hub /blog/best-aeo-tools-ai-search-visibility");
  });
  it("still rejects a missing scanner journey", () => {
    const result = lint("[Guide](/blog/best-aeo-tools-ai-search-visibility)");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("missing scanner CTA");
  });
});
