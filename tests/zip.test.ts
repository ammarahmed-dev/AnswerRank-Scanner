import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildZip, crc32 } from "@/lib/zip";

describe("zip", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes an archive that unzip can read back", () => {
    const dir = mkdtempSync(join(tmpdir(), "zip-"));
    const file = join(dir, "a.zip");
    writeFileSync(file, buildZip([
      { name: "robots.txt", content: "User-agent: *\nAllow: /\n" },
      { name: "llms.txt", content: "# Café\n" },
    ]));
    expect(readFileSync(file).subarray(0, 4).toString("hex")).toBe("504b0304");
    execFileSync("unzip", ["-tq", file], { stdio: "pipe" });
    expect(execFileSync("unzip", ["-p", file, "llms.txt"]).toString()).toBe("# Café\n");
  });
});
