import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const REDIRECT_SOURCES = new Set(
  [...readFileSync(join(root, "next.config.ts"), "utf8").matchAll(/source:\s*"(\/blog\/[^"]+)"/g)].map((m) => m[1]),
);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

describe("internal blog links in app code", () => {
  it("point at posts that exist or are redirected", () => {
    const slugs = new Set<string>();
    for (const f of readdirSync(join(root, "content/blog"))) {
      const text = readFileSync(join(root, "content/blog", f), "utf8");
      slugs.add(/^slug:\s*(.+)$/m.exec(text)?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? f.replace(/\.mdx$/, ""));
      slugs.add(f.replace(/\.mdx$/, ""));
    }
    const broken: string[] = [];
    for (const file of [...walk(join(root, "app")), ...walk(join(root, "lib"))]) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/["'`](\/blog\/([a-z0-9-]+))["'`]/g)) {
        if (!slugs.has(m[2]) && !REDIRECT_SOURCES.has(m[1]) && !existsSync(join(root, "app/blog", m[2]))) broken.push(`${file.replace(root + "/", "")}: ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
