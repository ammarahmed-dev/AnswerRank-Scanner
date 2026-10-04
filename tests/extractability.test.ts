import { describe, expect, it } from "vitest";
import { analyzeExtractability } from "@/lib/extractability";

const good =
  "AEOCheck scans a public URL and scores 25 signals that decide whether AI answer engines can read, understand and cite the page, then ranks every fix by impact.";

const page = (body: string) => `<html><body><nav><h2>Menu</h2><p>${good}</p></nav><main>${body}</main><footer><h2>Footer</h2></footer></body></html>`;

describe("analyzeExtractability", () => {
  it("scores answer-first sections as quotable", () => {
    const r = analyzeExtractability(page(`<h2>What does AEOCheck do?</h2><p>${good}</p><h2>How much does it cost?</h2><p>${good}</p><h3>Is there a free plan?</h3><p>${good}</p>`));
    expect(r.passages).toHaveLength(3);
    expect(r.quotableCount).toBe(3);
    expect(r.score).toBe(100);
    expect(r.questionHeadingCount).toBe(3);
    expect(r.dataPointCount).toBe(3);
  });

  it("flags filler openers, dangling references, short and long passages", () => {
    const long = Array(120).fill("word").join(" ");
    const r = analyzeExtractability(page(
      `<h2>Intro</h2><p>In this guide we will walk through everything you need to know about the topic at hand today.</p>` +
      `<h2>Details</h2><p>It works by reading the page and then deciding what to do with every single signal found inside.</p>` +
      `<h2>Short</h2><p>Too short to quote, really.</p>` +
      `<h2>Long</h2><p>${long}</p>`
    ));
    const byHeading = Object.fromEntries(r.passages.map((p) => [p.heading, p.issues]));
    expect(byHeading.Intro).toContain("filler_opener");
    expect(byHeading.Details).toContain("points_back");
    expect(byHeading.Short).toContain("too_short");
    expect(byHeading.Long).toContain("too_long");
    expect(r.quotableCount).toBe(0);
  });

  it("reports headings with no text and ignores nav/footer content", () => {
    const r = analyzeExtractability(page(`<h2>Empty</h2><h2>Next</h2><p>${good}</p>`));
    expect(r.passages.map((p) => p.heading)).toEqual(["Empty", "Next"]);
    expect(r.passages[0].issues).toEqual(["no_text"]);
  });

  it("does not flag an H2 that leads straight into an H3", () => {
    const r = analyzeExtractability(page(`<h2>Configurations</h2><h3>Policy one?</h3><p>${good}</p><h3>Policy two?</h3><p>${good}</p>`));
    expect(r.passages.map((p) => p.heading)).toEqual(["Policy one?", "Policy two?"]);
  });

  it("uses a list as the opening passage when no paragraph comes first", () => {
    const r = analyzeExtractability(page(`<h2>Steps?</h2><ul><li>Paste a URL into the scanner and run the scan on any public page today</li><li>Read the ranked list of fixes and apply the highest impact ones first</li></ul>`));
    expect(r.passages[0].words).toBeGreaterThanOrEqual(20);
    expect(r.passages[0].quotable).toBe(true);
  });

  it("adds notes for thin or question-free pages", () => {
    const thin = analyzeExtractability(page(`<h2>One</h2><p>${good}</p>`));
    expect(thin.notes.join(" ")).toContain("Very few");
    const plain = analyzeExtractability(page(`<h2>Alpha</h2><p>${good.replace(/\d+/g, "many")}</p><h2>Beta</h2><p>${good.replace(/\d+/g, "many")}</p><h2>Gamma</h2><p>${good.replace(/\d+/g, "many")}</p>`));
    expect(plain.notes.join(" ")).toContain("question");
    expect(plain.notes.join(" ")).toContain("number");
  });

  it("returns an empty, zero-score result for pages without sections", () => {
    const r = analyzeExtractability("<html><body><p>Just text.</p></body></html>");
    expect(r.passages).toEqual([]);
    expect(r.score).toBe(0);
  });
});
