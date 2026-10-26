import ServiceCtaLink from "./ServiceCtaLink";

export default function ServiceCta({ placement = "content" }: { placement?: "content" | "report" | "home" | "pricing" }) {
  return (
    <aside className={`service-cta surface${placement === "report" ? " print-hidden" : ""}`} aria-label="Implementation help">
      <div className="service-cta-text">
        <h2>{placement === "report" ? "Want help implementing these fixes?" : "Get help applying this to your website"}</h2>
        <p>Explore hands-on AEO, GEO and SEO implementation with an agreed scope and verification. Services are separate from scanner plans.</p>
      </div>
      <ServiceCtaLink placement={placement} />
    </aside>
  );
}
