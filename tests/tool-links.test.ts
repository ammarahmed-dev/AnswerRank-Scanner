import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOOL_FOR_CHECK, toolForCheck } from "@/lib/tool-links";

const engine = readFileSync("lib/score-engine.ts", "utf8");

describe("tool links", () => {
  it("only maps check ids that exist in the score engine", () => {
    for (const id of Object.keys(TOOL_FOR_CHECK)) {
      expect(engine, `check id ${id}`).toContain(`id: "${id}"`);
    }
  });

  it("points every check at a tool page that exists", () => {
    for (const { href } of Object.values(TOOL_FOR_CHECK)) {
      expect(existsSync(`app${href}/page.tsx`), href).toBe(true);
    }
  });

  it("returns null for checks without a tool", () => {
    expect(toolForCheck("title")).toBeNull();
    expect(toolForCheck("llms_txt")?.href).toBe("/tools/llms-txt-generator");
  });
});
