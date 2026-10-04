/** SVG badge for the embeddable "AI readiness" score. Pure functions, no network. */

export function normalizeBadgeDomain(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (!value || value.length > 100) return null;
  // Hostnames only: labels of letters, digits and hyphens, at least one dot, no ports or IPs.
  if (!/^(?=.{1,100}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(value)) return null;
  return value;
}

export function badgeColor(score: number | null): string {
  if (score === null) return "#64748b";
  if (score >= 80) return "#00b37e";
  if (score >= 60) return "#d9a000";
  return "#e0455a";
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderBadgeSvg(score: number | null): string {
  const label = "AI readiness";
  const value = score === null ? "n/a" : `${Math.max(0, Math.min(100, Math.round(score)))}/100`;
  const labelWidth = 92;
  const valueWidth = 56;
  const width = labelWidth + valueWidth;
  const title = score === null ? "AI readiness score unavailable" : `AI readiness score ${value} by AEOCheck`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="22" role="img" aria-label="${escapeXml(title)}">
<title>${escapeXml(title)}</title>
<clipPath id="r"><rect width="${width}" height="22" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${labelWidth}" height="22" fill="#1e293b"/><rect x="${labelWidth}" width="${valueWidth}" height="22" fill="${badgeColor(score)}"/></g>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${labelWidth / 2}" y="15">${label}</text>
<text x="${labelWidth + valueWidth / 2}" y="15" font-weight="bold">${escapeXml(value)}</text>
</g></svg>`;
}
