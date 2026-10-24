import { readBoundedText } from "@/lib/bounded-body";

export interface PageSpeedResult {
  score: number | null;
  lcp?: number | null;  // Largest Contentful Paint in seconds
  cls?: number | null;  // Cumulative Layout Shift score
  tbt?: number | null;  // Lighthouse Total Blocking Time in ms (lab data)
  error?: string;
}

export async function getPageSpeedScore(url: string, signal?: AbortSignal): Promise<PageSpeedResult> {
  const apiKey =
    process.env.GOOGLE_PAGESPEED_API_KEY ||
    process.env.PAGESPEED_API_KEY;
  if (!apiKey) return { score: null, error: "No Google PageSpeed API key configured." };

  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance`;
  const timeoutMs = Number(process.env.PAGESPEED_TIMEOUT_MS ?? 10000);
  const maxAttempts = Number(process.env.PAGESPEED_RETRY_ATTEMPTS ?? 2);
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    try {
      signal?.throwIfAborted();
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const res = await fetch(endpoint, {
        signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
      });

      if (!res.ok) {
        let message = `Google PageSpeed returned HTTP ${res.status}.`;
        try {
          const errorData = JSON.parse(await readBoundedText(res, 8_000_000)) as { error?: { message?: string } };
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

      const data = JSON.parse(await readBoundedText(res, 8_000_000)) as {
        lighthouseResult?: {
          categories?: {
            performance?: { score?: number };
          };
          audits?: {
            "largest-contentful-paint"?: { numericValue?: number };
            "cumulative-layout-shift"?: { numericValue?: number };
            "total-blocking-time"?: { numericValue?: number };
          };
        };
      };
      const score = data?.lighthouseResult?.categories?.performance?.score;
      if (typeof score === "number") {
        const audits = data.lighthouseResult?.audits;
        const lcpMs = audits?.["largest-contentful-paint"]?.numericValue;
        const cls = audits?.["cumulative-layout-shift"]?.numericValue;
        const tbtMs = audits?.["total-blocking-time"]?.numericValue;

        return {
          score: Math.round(score * 100),
          lcp: typeof lcpMs === "number" ? Math.round(lcpMs / 100) / 10 : null,
          cls: typeof cls === "number" ? Math.round(cls * 100) / 100 : null,
          tbt: typeof tbtMs === "number" ? Math.round(tbtMs) : null,
        };
      }
      lastError = "Google PageSpeed response did not include a performance score.";
      if (attempt >= maxAttempts) {
        return { score: null, error: lastError };
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    } catch (err: unknown) {
      signal?.throwIfAborted();
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

