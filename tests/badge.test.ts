import { describe, expect, it } from "vitest";
import { badgeColor, normalizeBadgeDomain, renderBadgeSvg } from "@/lib/badge";

describe("badge", () => {
  it("normalizes hostnames and rejects anything else", () => {
    expect(normalizeBadgeDomain("https://WWW.Example.com/path?x=1")).toBe("example.com");
    expect(normalizeBadgeDomain("shop.example.co.uk")).toBe("shop.example.co.uk");
    for (const bad of ["", "localhost", "127.0.0.1", "example.com:8080", "exa mple.com", "a..com", "-a.com", "http://[::1]", "x".repeat(120) + ".com", "evil.com@good.com"]) {
      expect(normalizeBadgeDomain(bad), bad).toBeNull();
    }
  });

  it("renders a score and an unavailable state", () => {
    expect(renderBadgeSvg(82)).toContain("82/100");
    expect(renderBadgeSvg(82)).toContain(badgeColor(82));
    expect(renderBadgeSvg(null)).toContain("n/a");
    expect(renderBadgeSvg(150)).toContain("100/100");
    expect(renderBadgeSvg(null).startsWith("<svg")).toBe(true);
  });

  it("colors by band", () => {
    expect(badgeColor(90)).not.toBe(badgeColor(65));
    expect(badgeColor(65)).not.toBe(badgeColor(30));
    expect(badgeColor(null)).toBe("#64748b");
  });
});
