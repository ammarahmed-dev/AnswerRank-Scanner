import { describe, expect, it } from "vitest";
import { GET } from "@/app/llms.txt/route";
import sitemap from "@/app/sitemap";
import { SERVICES_PATH } from "@/lib/service-enquiry";
import { SITE_URL } from "@/lib/seo";

describe("published machine-readable discovery", () => {
  it("lists only canonical sitemap blog destinations and the service page", async () => {
    const response = GET();
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    const text = await response.text();
    const listed = [...text.matchAll(/^- (https:\/\/[^ :]+\/blog\/[^ :]+):/gm)].map(match => match[1]);
    const canonical = (await sitemap()).map(entry => entry.url).filter(url => url.includes("/blog/"));
    expect(listed.sort()).toEqual(canonical.sort());
    expect(new Set(listed).size).toBe(listed.length);
    expect(text).toContain(`${SITE_URL}${SERVICES_PATH}`);
    expect(text).not.toContain("/blog/what-is-aeo-answer-engine-optimization:");
  });
  it("describes readiness and lab measurements without claiming observed inclusion", async () => {
    const text = await GET().text();
    expect(text).toContain("25 deterministic checks");
    expect(text).not.toContain("25+");
    expect(text).toContain("does not measure actual inclusion, citations or rankings");
    expect(text).toContain("not a real-user Core Web Vitals assessment");
    expect(text).toContain("does not control indexing or grant access");
    expect(text).not.toContain("## Do not index");
  });
});
