"use client";

import { useState } from "react";
import { CaretRight } from "@phosphor-icons/react";

const faqs = [
  ["Is it actually free?", "Yes. You can scan any public URL without creating an account and see your AEO score plus the top issues found. A free account gives you 3 scans per month. No credit card required at any point."],
  ["What is AEO and why does it matter?", "AEO (Answer Engine Optimization) is the practice of making your website understandable and citable by AI tools like ChatGPT, Perplexity, and Google AI Overviews. As more people get answers directly from AI instead of clicking search results, being a cited source is becoming as important as ranking on page one."],
  ["How is this different from Google Search Console?", "Google Search Console shows how your site performs in traditional Google search - rankings, clicks, and crawl errors. AEOCheck checks whether AI answer engines can read, understand, and cite your content. A site can rank well on Google and still be invisible to AI search. Different problem, different fixes."],
  ["Does it work without signup?", "Yes. Paste any public URL and run a free scan instantly. No account required."],
  ["What does the scanner check?", "It runs 25 AEO and GEO checks, including schema, metadata, headings, content clarity, and answer extraction structure."],
  ["Is this the same as a traditional SEO audit?", "No. Traditional SEO audits focus on keywords and backlinks. This scanner checks whether answer engines like ChatGPT and Perplexity can understand and cite your page."],
  ["Do you store my scan data?", "Scans are saved to your account when you're logged in. Free accounts see recent scans; paid accounts keep full report history."],
];

export default function HomeFaqSection() {
  const [activeFaq, setActiveFaq] = useState(0);
  return (
    <section className="faq-section" id="faq">
      <div className="launch-container faq-grid">
        <div className="section-intro">
          <p className="launch-eyebrow">FAQ</p>
          <h2>Common questions about the scan and report.</h2>
        </div>
        <div className="faq-rows">
          {faqs.map(([question, answer], index) => (
            <div key={question} className={`faq-item${activeFaq === index ? " is-open" : ""}`}>
              <button
                type="button"
                className="faq-question-row"
                aria-expanded={activeFaq === index}
                onClick={() => setActiveFaq(index)}
              >
                <span className="faq-question-text">{question}</span>
                <span className="faq-icon-wrap" aria-hidden="true">
                  <CaretRight weight="bold" size={16} />
                </span>
              </button>
              <div className="faq-answer-shell" aria-hidden={activeFaq !== index}>
                <div className="faq-answer">
                  <p>
                    {answer}
                    {question === "What does the scanner check?" && (
                      <>
                        {" "}For schema best practices, see{" "}
                        <a
                          href="https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
                          target="_blank"
                          rel="noopener noreferrer"
                          tabIndex={activeFaq !== index ? -1 : undefined}
                        >
                          Google Search Central structured data docs
                        </a>.
                      </>
                    )}
                    {question === "Is this the same as a traditional SEO audit?" && (
                      <>
                        {" "}You can <a href="#scanner" tabIndex={activeFaq !== index ? -1 : undefined}>run a free scan here</a> to see the difference.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
