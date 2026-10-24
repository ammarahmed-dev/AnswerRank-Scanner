import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sitemap from "@/app/sitemap";
import { getBlogPost } from "@/lib/blog";
import { PUBLIC_TOOL_PAGES } from "@/lib/public-tool-pages";
import { SITE_URL } from "@/lib/seo";

afterEach(() => { vi.useRealTimers(); });

describe("SEO discovery and modification dates", () => {
  it("does not mark unchanged static pages as modified on every build", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T00:00:00Z"));
    const first = await sitemap();
    vi.setSystemTime(new Date("2026-10-30T00:00:00Z"));
    expect(await sitemap()).toEqual(first);
    for (const page of first.filter(page => !page.url.includes("/blog/"))) expect(page.lastModified).toBeUndefined();
  });

  it("preserves publication dates and uses a recorded substantive update in the sitemap", async () => {
    const post = getBlogPost("best-aeo-tools-ai-search-visibility");
    expect(post?.date.slice(0, 10)).toBe("2026-05-21");
    expect(post?.updated?.slice(0, 10)).toBe("2026-10-25");
    const page = (await sitemap()).find(page => page.url.endsWith("/blog/best-aeo-tools-ai-search-visibility"));
    expect(new Date(page!.lastModified!).toISOString().slice(0, 10)).toBe("2026-10-25");
  });

  it("includes each real public tool exactly once using canonical URLs", async () => {
    const entries = await sitemap();
    const urls = entries.map(page => page.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const page of PUBLIC_TOOL_PAGES) {
      expect(existsSync(join(process.cwd(), "app", page.href, "page.tsx"))).toBe(true);
      expect(urls.filter(url => url === `${SITE_URL}${page.href}`)).toHaveLength(1);
    }
    expect(urls.every(url => url.startsWith(`${SITE_URL}/`))).toBe(true);
    expect(urls.some(url => /\/(?:api|dashboard|report|login|signup)(?:\/|$)/.test(new URL(url).pathname))).toBe(false);
  });
});
