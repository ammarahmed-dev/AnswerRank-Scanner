export type FaqPair = { question: string; answer: string };

/** Keeps pairs with both fields filled, trimmed and with collapsed inner whitespace. */
export function cleanFaqPairs(pairs: FaqPair[]): FaqPair[] {
  return pairs
    .map((p) => ({ question: p.question.replace(/\s+/g, " ").trim(), answer: p.answer.replace(/[ \t]+/g, " ").trim() }))
    .filter((p) => p.question && p.answer);
}

export function buildFaqSchema(pairs: FaqPair[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cleanFaqPairs(pairs).map((p) => ({
      "@type": "Question",
      name: p.question,
      acceptedAnswer: { "@type": "Answer", text: p.answer },
    })),
  };
}

/** JSON-LD safe to embed in a script tag: "<" is escaped so "</script>" in text cannot end the tag. */
export function faqSchemaJson(pairs: FaqPair[]): string {
  return JSON.stringify(buildFaqSchema(pairs), null, 2).replace(/</g, "\\u003c");
}

export function faqSchemaScriptTag(pairs: FaqPair[]): string {
  return `<script type="application/ld+json">\n${faqSchemaJson(pairs)}\n</script>`;
}

/** Plain-language issues that stop the markup from being useful. Empty when it is ready to publish. */
export function faqSchemaWarnings(pairs: FaqPair[]): string[] {
  const clean = cleanFaqPairs(pairs);
  const warnings: string[] = [];
  if (!clean.length) warnings.push("Add at least one question with an answer.");
  if (clean.some((p) => !p.question.endsWith("?"))) warnings.push("Write questions as real questions ending in a question mark.");
  if (clean.some((p) => p.answer.length < 40)) warnings.push("Some answers are very short. Aim for a direct answer of a sentence or two.");
  if (pairs.some((p) => (p.question.trim() === "") !== (p.answer.trim() === ""))) warnings.push("Some entries have only a question or only an answer and will be skipped.");
  return warnings;
}
