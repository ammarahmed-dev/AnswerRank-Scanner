import * as cheerio from "cheerio";

/**
 * Heuristic check of how easily AI answer engines can lift a passage from a page: each H2/H3
 * section is judged by its opening passage (the text directly under the heading). This does not
 * predict citations; it flags structural problems that make passages hard to quote on their own.
 */

export type PassageIssue = "too_short" | "too_long" | "points_back" | "filler_opener" | "no_text";

export type Passage = {
  heading: string;
  level: 2 | 3;
  questionHeading: boolean;
  /** Opening passage text, trimmed to a readable length. Empty when the heading has no text under it. */
  text: string;
  words: number;
  hasDataPoint: boolean;
  issues: PassageIssue[];
  quotable: boolean;
};

export type ExtractabilityResult = {
  passages: Passage[];
  score: number;
  quotableCount: number;
  questionHeadingCount: number;
  dataPointCount: number;
  notes: string[];
};

export const ISSUE_COPY: Record<PassageIssue, string> = {
  too_short: "Too short to stand alone. Give a complete answer in 20 to 90 words.",
  too_long: "Too long to quote. Lead with a 40 to 60 word answer, then add detail.",
  points_back: "Starts by pointing back to earlier text (This, It, They), so it makes no sense out of context.",
  filler_opener: "Opens with filler instead of the answer. Put the answer in the first sentence.",
  no_text: "No text directly under this heading. Add a direct answer before any list, image or subheading.",
};

const MIN_WORDS = 20;
const MAX_WORDS = 90;
const MAX_TEXT_CHARS = 280;

const POINTS_BACK = /^(this|that|these|those|it|they|he|she|such|here|the above|as (mentioned|noted|discussed))\b/i;
const FILLER = /^(in this (section|article|post|guide|chapter)|welcome|let'?s|let us|as we (all )?know|have you ever|are you (looking|struggling)|in today'?s|when it comes to|there are many)/i;
const DATA_POINT = /\d/;

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function clip(text: string): string {
  return text.length <= MAX_TEXT_CHARS ? text : `${text.slice(0, MAX_TEXT_CHARS).replace(/\s+\S*$/, "")}...`;
}

function judge(text: string): PassageIssue[] {
  if (!text) return ["no_text"];
  const issues: PassageIssue[] = [];
  const words = wordCount(text);
  if (words < MIN_WORDS) issues.push("too_short");
  if (words > MAX_WORDS) issues.push("too_long");
  if (POINTS_BACK.test(text)) issues.push("points_back");
  if (FILLER.test(text)) issues.push("filler_opener");
  return issues;
}

export function analyzeExtractability(html: string): ExtractabilityResult {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, aside, form, svg, iframe").remove();

  const root = $("main").first().length ? $("main").first() : $("article").first().length ? $("article").first() : $("body");
  const nodes = root
    .find("h2, h3, p, ul, ol")
    .toArray()
    .filter((el) => $(el).parents("ul, ol, table, blockquote").length === 0);

  type Open = { heading: string; level: 2 | 3; text: string; wrapper?: boolean };
  const sections: Open[] = [];
  let current: Open | null = null;

  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (tag === "h2" || tag === "h3") {
      if (!text) continue;
      const level = tag === "h2" ? 2 : 3;
      // An H2 that goes straight into an H3 is a section wrapper, not a heading missing its answer.
      if (current && !current.text && level > current.level) current.wrapper = true;
      current = { heading: text, level, text: "" };
      sections.push(current);
    } else if (current && !current.text) {
      // Opening passage = first real paragraph (or list) under the heading.
      if (tag === "p" && wordCount(text) < 5) continue;
      current.text = tag === "p" ? text : $(el).find("li").toArray().map((li) => $(li).text().replace(/\s+/g, " ").trim()).join(". ");
    }
  }

  const passages: Passage[] = sections.filter((s) => !s.wrapper).map((s) => {
    const issues = judge(s.text);
    return {
      heading: s.heading,
      level: s.level,
      questionHeading: /\?\s*$/.test(s.heading) || /^(what|how|why|when|which|who|can|should|does|is|are)\b/i.test(s.heading),
      text: clip(s.text),
      words: wordCount(s.text),
      hasDataPoint: DATA_POINT.test(s.text),
      issues,
      quotable: issues.length === 0,
    };
  });

  const quotableCount = passages.filter((p) => p.quotable).length;
  const notes: string[] = [];
  if (passages.length < 3) notes.push("Very few H2/H3 sections found. Break the page into question-style sections so each answer can be quoted separately.");
  else if (passages.every((p) => !p.questionHeading)) notes.push("No section headings are phrased as questions. Question-style headings match how people prompt AI engines.");
  if (passages.length >= 3 && passages.every((p) => !p.hasDataPoint)) notes.push("No opening passage contains a number. Concrete figures, dates and named sources make passages more citable.");

  return {
    passages,
    score: passages.length ? Math.round((quotableCount / passages.length) * 100) : 0,
    quotableCount,
    questionHeadingCount: passages.filter((p) => p.questionHeading).length,
    dataPointCount: passages.filter((p) => p.hasDataPoint).length,
    notes,
  };
}
