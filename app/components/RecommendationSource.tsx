import type { AIInsights } from "@/types/index";

/** Saved JSON may predate provenance. Never infer its source from prose or scan time. */
export default function RecommendationSource({ insights }: { insights: AIInsights | null | undefined }) {
  const provenance = insights?.provenance;
  const known = provenance?.kind === "provider_generated"
    && ["DeepSeek", "OpenRouter", "Gemini"].includes(provenance.provider)
    && typeof provenance.generatedAt === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(provenance.generatedAt)
    && Number.isFinite(Date.parse(provenance.generatedAt));
  const model = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:/@+-]{0,159}$/.test(value) ? value : undefined;
  const requested = known ? model(provenance.requestedModel) : undefined;
  const reported = known ? model(provenance.responseModel) : undefined;
  return (
    <div className="recommendation-source" role="note" aria-label="Recommendation source">
      <p><strong>{!insights ? "Local rule-based guidance" : known ? "AI-generated guidance with rule-based checks" : "Analysis source unavailable"}</strong></p>
      <p>{!insights
        ? "This report uses local summaries and recommendations derived from scan findings. No generated insight is attached."
        : known
          ? "Summary and suggestions use generated analysis with deterministic checks and corrections. Scores and detected schema come from scan checks."
          : "This saved or illustrative analysis has no complete generation record. Its provider, model and generation time cannot be confirmed; local checks and corrections may also be present."}</p>
      {known && <>
        <p>Provider: {provenance.provider}. Generated: <time dateTime={provenance.generatedAt}>{new Date(provenance.generatedAt).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}</time>. Reused insights retain their original generation time.</p>
        <p>Requested model: {requested ?? "Not recorded"}. Provider-reported model: {reported ?? "Not supplied"}. Model identity is not independently verified.</p>
      </>}
      <p>This is a readiness interpretation, not an observed answer or citation from an AI search engine. Review suggestions before publishing.</p>
    </div>
  );
}
