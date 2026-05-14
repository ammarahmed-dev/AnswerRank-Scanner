export interface PageSpeedResult {
  score: number | null;
  lcp?: number | null;  // Largest Contentful Paint in seconds
  cls?: number | null;  // Cumulative Layout Shift score
  fid?: number | null;  // First Input Delay in ms (or INP)
  error?: string;
}

export async function getPageSpeedScore(url: string): Promise<PageSpeedResult> {
  const apiKey =
    process.env.GOOGLE_PAGESPEED_API_KEY ||
    process.env.PAGESPEED_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) return { score: null, error: "No Google PageSpeed API key configured." };

  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance`;
  const timeoutMs = Number(process.env.PAGESPEED_TIMEOUT_MS ?? 10000);
  const maxAttempts = Number(process.env.PAGESPEED_RETRY_ATTEMPTS ?? 2);
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
        lastError = message;
        const shouldRetry = res.status >= 500 || res.status === 429;
        if (!shouldRetry || attempt >= maxAttempts) {
          return { score: null, error: message };
        }
        await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
        continue;
      }

      const data = await res.json() as {
        lighthouseResult?: {
          categories?: {
            performance?: { score?: number };
          };
          audits?: {
            "largest-contentful-paint"?: { numericValue?: number };
            "cumulative-layout-shift"?: { numericValue?: number };
            "total-blocking-time"?: { numericValue?: number };
            "interactive"?: { numericValue?: number };
          };
        };
      };
      const score = data?.lighthouseResult?.categories?.performance?.score;
      if (typeof score === "number") {
        const audits = data.lighthouseResult?.audits;
        const lcpMs = audits?.["largest-contentful-paint"]?.numericValue;
        const cls = audits?.["cumulative-layout-shift"]?.numericValue;
        const fidMs = audits?.["total-blocking-time"]?.numericValue
          ?? audits?.["interactive"]?.numericValue;

        return {
          score: Math.round(score * 100),
          lcp: typeof lcpMs === "number" ? Math.round(lcpMs / 100) / 10 : null,
          cls: typeof cls === "number" ? Math.round(cls * 100) / 100 : null,
          fid: typeof fidMs === "number" ? Math.round(fidMs) : null,
        };
      }
      lastError = "Google PageSpeed response did not include a performance score.";
      if (attempt >= maxAttempts) {
        return { score: null, error: lastError };
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google PageSpeed request failed.";
      lastError = message.toLowerCase().includes("abort")
        ? "Google PageSpeed timed out before returning a score."
        : message;
      if (attempt >= maxAttempts) {
        return { score: null, error: lastError };
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }

  return { score: null, error: lastError ?? "Google PageSpeed request failed." };
}

