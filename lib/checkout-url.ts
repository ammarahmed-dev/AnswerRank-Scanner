/** Accept only bounded HTTPS URLs on the existing hosted checkout domain. */
export function trustedCheckoutUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 8192 || !/^https:\/\//i.test(value) || value.includes("\\") || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.hostname !== "lemonsqueezy.com" && !url.hostname.endsWith(".lemonsqueezy.com")) return null;
    // Preserve the provider's signed path/query exactly after validation.
    return value;
  } catch {
    return null;
  }
}
