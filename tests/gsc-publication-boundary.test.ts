import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

describe("private Search Console publication boundary", () => {
  it("makes a stale legacy invocation fail without writing artifacts or using credentials", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gsc-retired-"));
    try {
      writeFileSync(join(cwd, "sentinel.json"), '{"keep":true}');
      const result = spawnSync(process.execPath, [resolve("scripts/gsc-feedback.mjs")], {
        cwd, encoding: "utf8", timeout: 5000,
        env: { ...process.env, GSC_SITE_URL: "sc-domain:private.invalid", GSC_CLIENT_EMAIL: "private@example.invalid", GSC_PRIVATE_KEY: "private-sentinel" },
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("publication is retired");
      expect(result.stdout + result.stderr).not.toContain("private-sentinel");
      expect(readdirSync(cwd)).toEqual(["sentinel.json"]);
      expect(readFileSync(join(cwd, "sentinel.json"), "utf8")).toBe('{"keep":true}');
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
  it("removes the publisher's automatic trigger, credential access and write capabilities", () => {
    const workflow = readFileSync(".github/workflows/gsc-feedback.yml", "utf8");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("contents: read");
    expect(workflow).not.toMatch(/schedule:|cron:|: write|secrets\.|github\.token|actions\/checkout|git push|gh issue|node scripts\/gsc-feedback/);
    const overview = readFileSync(".github/workflows/gsc-overview.yml", "utf8");
    expect(overview).toContain("contents: read");
    expect(overview).toContain("node scripts/gsc-overview.mjs");
    expect(overview).not.toMatch(/: write|git push|gh issue/);
  });
  it("keeps tracked feedback notices free of query and performance tables", () => {
    const files = readdirSync("reports").filter(name => /^gsc-feedback-.*\.md$/.test(name));
    expect(files.length).toBeGreaterThan(0);
    const ignored = spawnSync("git", ["-c", "core.fsmonitor=false", "check-ignore", "--no-index", "reports/gsc-feedback-2099-01-01.md"], { encoding: "utf8" });
    expect(ignored.status).toBe(0);
    for (const file of files) {
      const body = readFileSync(join("reports", file), "utf8");
      expect(body).toContain("publication retired");
      expect(body).toContain("does not remove earlier Git history");
      expect(body).not.toMatch(/impressions|clicks|\| pos |Striking distance|Content gaps|Decaying pages/);
    }
  });
});
