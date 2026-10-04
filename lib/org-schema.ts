import { jsonLdScriptTag } from "@/lib/jsonld";

export type OrgInput = {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  /** Profile URLs, one per entry (LinkedIn, X, GitHub, Crunchbase, Wikipedia...). */
  sameAs?: string[];
  email?: string;
  telephone?: string;
  foundingDate?: string;
  includeWebSite?: boolean;
};

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function clean(value?: string): string | undefined {
  const v = value?.replace(/\s+/g, " ").trim();
  return v ? v : undefined;
}

export function orgSchemaProblems(input: OrgInput): string[] {
  const problems: string[] = [];
  if (!clean(input.name)) problems.push("Enter your organization name.");
  if (!clean(input.url)) problems.push("Enter your website URL.");
  else if (!isHttpUrl(input.url)) problems.push("The website must be a full URL like https://example.com.");
  if (clean(input.logo) && !isHttpUrl(input.logo!)) problems.push("The logo must be a full image URL starting with https://.");
  const badLinks = (input.sameAs ?? []).map((s) => s.trim()).filter((s) => s && !isHttpUrl(s));
  if (badLinks.length) problems.push(`These profile links are not full URLs: ${badLinks.join(", ")}`);
  if (clean(input.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email!.trim())) problems.push("The email address does not look valid.");
  if (clean(input.foundingDate) && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(input.foundingDate!.trim())) problems.push("Founding date should be a year (2019) or a date (2019-04-30).");
  return problems;
}

export function buildOrgSchema(input: OrgInput) {
  const url = clean(input.url) ?? "";
  const origin = isHttpUrl(url) ? new URL(url).origin : url;
  const orgId = `${origin}/#organization`;
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": orgId,
    name: clean(input.name),
    url,
  };
  const logo = clean(input.logo);
  if (logo) organization.logo = { "@type": "ImageObject", url: logo };
  const description = clean(input.description);
  if (description) organization.description = description;
  const sameAs = (input.sameAs ?? []).map((s) => s.trim()).filter(Boolean);
  if (sameAs.length) organization.sameAs = sameAs;
  const email = clean(input.email);
  if (email) organization.email = email;
  const telephone = clean(input.telephone);
  if (telephone) organization.telephone = telephone;
  const founded = clean(input.foundingDate);
  if (founded) organization.foundingDate = founded;

  const graph: Record<string, unknown>[] = [organization];
  if (input.includeWebSite !== false) {
    graph.push({
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: clean(input.name),
      url,
      publisher: { "@id": orgId },
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function orgSchemaScriptTag(input: OrgInput): string {
  return jsonLdScriptTag(buildOrgSchema(input));
}
