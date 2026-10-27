import type { CitationEvidence } from "@/lib/ai-visibility";
import { safeFetch } from "@/lib/url-safety";

/** Read-only HEAD checks, shared across one run. No credentials, bodies, retries or persistent cache. */
export async function verifyCitationDestinations(urls: string[]): Promise<CitationEvidence[]> {
  const unique = [...new Set(urls)];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  const evidence = new Map<string, CitationEvidence>();
  const allowed = unique.slice(0, 20);
  for (const sourceUrl of unique.slice(20)) evidence.set(sourceUrl, { sourceUrl, state: "unverified", reason: "budget" });
  let cursor = 0;
  try {
    await Promise.all(Array.from({ length: Math.min(3, allowed.length) }, async () => {
      while (cursor < allowed.length) {
        const sourceUrl = allowed[cursor++];
        if (controller.signal.aborted) {
          evidence.set(sourceUrl, { sourceUrl, state: "unverified", reason: "deadline" });
          continue;
        }
        try {
          let abortCheck: (() => void) | undefined;
          const aborted = new Promise<never>((_, reject) => {
            abortCheck = () => reject(new Error("Source check deadline"));
            controller.signal.addEventListener("abort", abortCheck, { once: true });
            if (controller.signal.aborted) abortCheck();
          });
          const pending = (async () => {
            const { response, finalUrl } = await safeFetch(sourceUrl, {
              method: "HEAD", signal: controller.signal, maxRedirects: 3,
              headers: { "User-Agent": "AEOCheckSourceVerifier/1.0 (+https://www.aeocheck.co)" },
            });
            // A late response must still release its body after the caller's deadline.
            void response.body?.cancel().catch(() => undefined);
            controller.signal.throwIfAborted();
            if (finalUrl.length > 4096) throw new Error("Source destination exceeds URL limit");
            return response.ok
              ? { sourceUrl, state: "resolved" as const, finalUrl, httpStatus: response.status }
              : { sourceUrl, state: "unverified" as const, httpStatus: response.status, reason: "http_error" as const };
          })();
          try { evidence.set(sourceUrl, await Promise.race([pending, aborted])); }
          finally { if (abortCheck) controller.signal.removeEventListener("abort", abortCheck); }
        } catch {
          evidence.set(sourceUrl, { sourceUrl, state: "unverified", reason: controller.signal.aborted ? "deadline" : "request_failed" });
        }
      }
    }));
  } finally { clearTimeout(timer); }
  return unique.map(sourceUrl => evidence.get(sourceUrl)!);
}
