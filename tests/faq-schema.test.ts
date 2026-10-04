import { describe, expect, it } from "vitest";
import { buildFaqSchema, cleanFaqPairs, faqSchemaJson, faqSchemaScriptTag, faqSchemaWarnings } from "@/lib/faq-schema";

describe("faq schema", () => {
  it("builds FAQPage JSON-LD and skips incomplete entries", () => {
    const schema = buildFaqSchema([
      { question: "  What   is AEO? ", answer: "Answer engine optimization." },
      { question: "No answer?", answer: "  " },
      { question: "", answer: "No question" },
    ]);
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toEqual([
      { "@type": "Question", name: "What is AEO?", acceptedAnswer: { "@type": "Answer", text: "Answer engine optimization." } },
    ]);
  });

  it("escapes < so the snippet cannot close the script tag", () => {
    const json = faqSchemaJson([{ question: "Q?", answer: "Use </script><b>x</b> carefully" }]);
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).mainEntity[0].acceptedAnswer.text).toBe("Use </script><b>x</b> carefully");
    const tag = faqSchemaScriptTag([{ question: "Q?", answer: "A" }]);
    expect(tag.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(tag.endsWith("</script>")).toBe(true);
  });

  it("warns about empty, non-question and short or half-filled entries", () => {
    expect(faqSchemaWarnings([])).toContain("Add at least one question with an answer.");
    expect(faqSchemaWarnings([{ question: "Pricing", answer: "x".repeat(60) }]).join(" ")).toContain("question mark");
    expect(faqSchemaWarnings([{ question: "Why?", answer: "Because." }]).join(" ")).toContain("very short");
    expect(faqSchemaWarnings([{ question: "Why?", answer: "" }, { question: "OK?", answer: "x".repeat(60) }]).join(" ")).toContain("only a question");
    expect(faqSchemaWarnings([{ question: "Why is this good?", answer: "x".repeat(60) }])).toEqual([]);
  });

  it("cleanFaqPairs trims whitespace", () => {
    expect(cleanFaqPairs([{ question: " A\n B? ", answer: " ok  fine " }])).toEqual([{ question: "A B?", answer: "ok fine" }]);
  });
});
