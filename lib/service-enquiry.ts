export const SERVICES_PATH = "/services/aeo-geo-implementation";
export const SERVICE_ENGAGEMENTS = [
  { value: "unsure", label: "Help me choose" },
  { value: "fixes", label: "Fixes Sprint" },
  { value: "key-pages", label: "AEO/GEO Foundation" },
  { value: "ongoing", label: "Ongoing Optimization" },
] as const;
export const SERVICE_PLATFORMS = [
  { value: "unsure", label: "Not sure yet" },
  { value: "webflow", label: "Webflow" },
  { value: "wordpress", label: "WordPress" },
  { value: "nextjs", label: "Next.js / React" },
  { value: "shopify", label: "Shopify" },
  { value: "other", label: "Another platform" },
] as const;
export const SERVICE_SOURCES = ["services-page", "content", "report", "home", "pricing", "direct"] as const;
export type ServiceSource = typeof SERVICE_SOURCES[number];
export type ServiceEnquiry = {
  website: string;
  platform: typeof SERVICE_PLATFORMS[number]["value"];
  engagement: typeof SERVICE_ENGAGEMENTS[number]["value"];
  source: ServiceSource;
};
export type ServiceErrors = Partial<Record<keyof ServiceEnquiry, string>>;

export function serviceSource(value: string | null | undefined): ServiceSource {
  return SERVICE_SOURCES.find(source => source === value) ?? "services-page";
}

export function validateServiceEnquiry(input: unknown):
  { ok: true; value: ServiceEnquiry } | { ok: false; errors: ServiceErrors } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: { website: "Add your website URL so we can review the scope." } };
  }
  const raw = input as Record<string, unknown>;
  const errors: ServiceErrors = {};
  const website = typeof raw.website === "string" ? raw.website.trim() : "";
  let normalized = "";
  try {
    if (!website || website.length > 2048 || /[\u0000-\u0020\u007f]/.test(website)) throw new Error("Invalid URL");
    const url = new URL(website);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname ||
        url.username || url.password || url.search || url.hash) throw new Error("Invalid URL");
    normalized = url.href;
  } catch {
    errors.website = "Use an http:// or https:// website URL without passwords, query strings or fragments.";
  }
  const platform = SERVICE_PLATFORMS.find(option => option.value === (raw.platform ?? "unsure"))?.value;
  const engagement = SERVICE_ENGAGEMENTS.find(option => option.value === (raw.engagement ?? "unsure"))?.value;
  const source = SERVICE_SOURCES.find(option => option === (raw.source ?? "direct"));
  if (!platform) errors.platform = "Select a platform from the list.";
  if (!engagement) errors.engagement = "Select a service option from the list.";
  if (!source) errors.source = "This enquiry link is invalid. Please reload the services page.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { website: normalized, platform: platform!, engagement: engagement!, source: source! } };
}

export function serviceMessage(service: ServiceEnquiry, message: string): string {
  const platform = SERVICE_PLATFORMS.find(option => option.value === service.platform)!.label;
  const engagement = SERVICE_ENGAGEMENTS.find(option => option.value === service.engagement)!.label;
  return `[Implementation enquiry]\nWebsite: ${service.website}\nPlatform: ${platform}\nScope preference: ${engagement}\nEntry point (self-reported): ${service.source}\n\nRequest:\n${message}`;
}
