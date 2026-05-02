export interface PageSpeedResult {
  score: number | null;
  error?: string;
}

export async function getPageSpeedScore(url: string): Promise<PageSpeedResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) return { score: null, error: "No Google PageSpeed API key configured." };

  try {
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let res: Response;
    try {
      res = await fetch(endpoint, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      let message = `Google PageSpeed returned HTTP ${res.status}.`;
      try {
        const errorData = await res.json() as { error?: { message?: string } };
        if (errorData.error?.message) message = errorData.error.message;
      } catch {
        // Keep HTTP status message.
      }
      return { score: null, error: message };
    }

    const data = await res.json() as {
      lighthouseResult?: {
        categories?: {
          performance?: { score?: number };
        };
      };
    };
    const score = data?.lighthouseResult?.categories?.performance?.score;
    if (typeof score === "number") {
      return { score: Math.round(score * 100) };
    }
    return { score: null, error: "Google PageSpeed response did not include a performance score." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Google PageSpeed request failed.";
    return {
      score: null,
      error: message.toLowerCase().includes("abort")
        ? "Google PageSpeed timed out before returning a score."
        : message
    };
  }
}
