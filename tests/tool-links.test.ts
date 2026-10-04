import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOOLS_FOR_CHECK, toolsForCheck } from "@/lib/tool-links";

const engine = readFileSync("lib/score-engine.ts", "utf8");

describe("tool links", () => {
  it("only maps check ids that exist in the score engine", () => {
    for (const id of Object.keys(TOOLS_FOR_CHECK)) {
      expect(engine, `check id ${id}`).toContain(`id: "${id}"`);
    }
  });

  it("points every check at a tool page that exists", () => {
    for (const { href } of Object.values(TOOLS_FOR_CHECK).flat()) {
      expect(existsSync(`app${href}/page.tsx`), href).toBe(true);
    }
  });

  it("returns no tools for checks without one", () => {
    expect(toolsForCheck("https")).toEqual([]);
    expect(toolsForCheck("llms_txt")[0]?.href).toBe("/tools/llms-txt-generator");
    expect(toolsForCheck("ai_bot_access").map((t) => t.href)).toEqual(["/tools/ai-crawler-checker", "/tools/robots-txt-generator"]);
  });
});
