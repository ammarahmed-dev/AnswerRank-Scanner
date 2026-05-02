export async function getPageSpeedScore(url: string): Promise<number | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) return null;

  try {
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json() as {
      lighthouseResult?: {
        categories?: {
          performance?: { score?: number };
        };
      };
    };
    const score = data?.lighthouseResult?.categories?.performance?.score;
    if (typeof score === "number") {
      return Math.round(score * 100);
    }
    return null;
  } catch {
    return null;
  }
}
