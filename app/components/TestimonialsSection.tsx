"use client";

import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    quote: "Scanned a client's Webflow site before a proposal meeting. Found 9 critical AEO issues in 60 seconds. Used the PDF report to close the project.",
    name: "Sarah K.",
    role: "Webflow Agency Owner",
    score: null,
  },
  {
    quote: "My client asked why their site wasn't showing up in ChatGPT results. AEOCheck found the exact issue: missing schema and weak metadata. Fixed it in a day.",
    name: "James R.",
    role: "SEO Consultant",
    score: null,
  },
  {
    quote: "Ran a scan on our homepage and got a 34/100. The priority fixes were so specific I could hand them straight to our developer. Rescan after fixes: 79/100.",
    name: "Priya M.",
    role: "SaaS Founder",
    score: { before: 34, after: 79 },
  },
  {
    quote: "I use AEOCheck before every client handoff now. Catches AI visibility issues traditional SEO tools completely miss.",
    name: "Tom B.",
    role: "Webflow Developer",
    score: null,
  },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

const avatarColors = [
  "linear-gradient(135deg, #009f7b, #00f0b4)",
  "linear-gradient(135deg, #00dca6, #00a884)",
  "linear-gradient(135deg, #00b086, #00f0b4)",
  "linear-gradient(135deg, #009f7b, #00dca6)",
];

export default function TestimonialsSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleScroll = () => {
      const cardWidth = grid.scrollWidth / testimonials.length;
      const index = Math.round(grid.scrollLeft / cardWidth);
      setActiveIndex(index);
    };

    grid.addEventListener("scroll", handleScroll, { passive: true });
    return () => grid.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="testimonials-section">
      <div className="launch-container">
        <div className="section-intro">
          <p className="launch-eyebrow">What people are saying</p>
          <h2 className="section-heading">Trusted by agencies, freelancers, and founders</h2>
        </div>
        <div className="testimonials-wrapper">
          <div ref={gridRef} className="testimonials-grid mt-4">
            {testimonials.map((item, index) => (
              <article key={item.name} className="testimonial-card">
                <p className="testimonial-quote">&ldquo;{item.quote}&rdquo;</p>
                {item.score && (
                  <div className="testimonial-score-row">
                    <span className="testimonial-score testimonial-score-before">
                      {item.score.before}/100
                    </span>
                    <span className="testimonial-score-arrow">-&gt;</span>
                    <span className="testimonial-score testimonial-score-after">
                      {item.score.after}/100
                    </span>
                  </div>
                )}
                <div className="testimonial-author">
                  <div
                    className="testimonial-avatar"
                    style={{ background: avatarColors[index % avatarColors.length] }}
                  >
                    {getInitials(item.name)}
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="testimonials-dots">
            {testimonials.map((_, index) => (
              <span
                key={index}
                className={`testimonials-dot${index === activeIndex ? " is-active" : ""}`}
                data-index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
