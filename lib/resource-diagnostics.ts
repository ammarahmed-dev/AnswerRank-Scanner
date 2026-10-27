import { BodyTooLargeError, readBoundedText } from "@/lib/bounded-body";
import { safeFetch } from "@/lib/url-safety";
import type { ResourceDiagnostic } from "@/types/index";

export type ResourceValidationResult = {
  status: "pass" | "warn" | "fail";
  detail: string;
  diagnostic: ResourceDiagnostic;
  body?: string;
  finalUrl?: string;
};
class ResourceTimeoutError extends Error {}

async function fetchResource(url: string, maxRedirects: number, maxBytes: number, signal?: AbortSignal, sendAccept = true) {
  signal?.throwIfAborted();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  try {
    const { response, finalUrl } = await safeFetch(url, {
      signal: combined,
      maxRedirects,
      headers: {
        "User-Agent": "AEOCheckScanner/1.0 (+https://www.aeocheck.co)",
        ...(sendAccept ? { Accept: "text/plain, application/xml, text/xml;q=0.9, */*;q=0.8" } : {}),
      },
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return { response, body: "", finalUrl };
    }
    const body = await readBoundedText(response, maxBytes, combined);
    return { response, body, finalUrl };
  } catch (error) {
    signal?.throwIfAborted();
    if (controller.signal.aborted) throw new ResourceTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function httpFailure(name: string, code: number, missingStatus: "warn" | "fail"): ResourceValidationResult {
  if (code === 404) return {
    status: missingStatus, detail: `${name} not found (HTTP 404)`,
    diagnostic: { state: "not_found", httpStatus: code },
  };
  if ([401, 403, 429].includes(code)) return {
    status: "warn", detail: `${name} could not be verified: scanner request restricted (HTTP ${code}); absence is not established`,
    diagnostic: { state: "blocked", httpStatus: code },
  };
  return {
    status: "warn", detail: `${name} could not be verified: HTTP ${code}; absence is not established`,
    diagnostic: { state: "http_error", httpStatus: code },
  };
}
function fetchFailure(name: string, error: unknown, signal?: AbortSignal): ResourceValidationResult {
  signal?.throwIfAborted();
  if (error instanceof BodyTooLargeError) return {
    status: "warn", detail: `${name} response exceeded the scan byte limit; contents could not be verified`,
    diagnostic: { state: "invalid_response", reason: "body_limit" },
  };
  const timedOut = error instanceof ResourceTimeoutError;
  return {
    status: "warn", detail: `${name} could not be verified: ${timedOut ? "request timed out" : "request could not be completed"}; absence is not established`,
    diagnostic: { state: "unreachable", reason: timedOut ? "timeout" : "fetch_failed" },
  };
}

export async function checkRobotsTxt(baseUrl: string, signal?: AbortSignal): Promise<ResourceValidationResult> {
  try {
    const { response, body, finalUrl } = await fetchResource(`${new URL(baseUrl).origin}/robots.txt`, 5, 2_500_000, signal);
    if (response.status !== 200) return httpFailure("robots.txt", response.status, "fail");
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!/<(?:!doctype|html|head|body)\b/i.test(body) &&
        (contentType.includes("text/plain") || /^\s*user-agent\s*:/im.test(body))) {
      return { status: "pass", detail: "robots.txt found and accessible", body, finalUrl,
        diagnostic: { state: "available", httpStatus: 200 } };
    }
    return { status: "warn", detail: "robots.txt returned an unrecognized policy response; rules could not be verified",
      diagnostic: { state: "invalid_response", httpStatus: 200 } };
  } catch (error) { return fetchFailure("robots.txt", error, signal); }
}

function sitemapFromRobots(body?: string): string | null {
  for (const line of body?.split(/\r?\n/) ?? []) {
    const match = line.trim().match(/^sitemap:\s*(.+)$/i);
    if (!match) continue;
    try { return new URL(match[1].trim()).toString(); } catch { /* Try the next declared sitemap. */ }
  }
  return null;
}

export async function checkSitemapXml(baseUrl: string, robotsBody?: string, signal?: AbortSignal): Promise<ResourceValidationResult> {
  try {
    const target = sitemapFromRobots(robotsBody) ?? `${new URL(baseUrl).origin}/sitemap.xml`;
    const { response, body } = await fetchResource(target, 2, 2_500_000, signal);
    if (response.status !== 200) return httpFailure("sitemap.xml", response.status, "fail");
    // Preserve the existing structural heuristic, not a full XML conformance claim.
    if (/<urlset\b/i.test(body) || /<sitemapindex\b/i.test(body)) {
      return { status: "pass", detail: "sitemap.xml found with a recognizable sitemap root", diagnostic: { state: "available", httpStatus: 200 } };
    }
    return { status: "warn", detail: "sitemap.xml returned an unrecognized sitemap response; contents could not be verified",
      diagnostic: { state: "invalid_response", httpStatus: 200 } };
  } catch (error) { return fetchFailure("sitemap.xml", error, signal); }
}

export async function checkLlmsTxt(baseUrl: string, signal?: AbortSignal): Promise<ResourceValidationResult> {
  try {
    const { response, body } = await fetchResource(new URL("/llms.txt", baseUrl).toString(), 5, 500_000, signal, false);
    if (!response.ok) return httpFailure("llms.txt", response.status, "warn");
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !/<(?:!doctype|html|head|body)\b/i.test(body) && /^#\s+\S/m.test(body)) {
      return { status: "pass", detail: "llms.txt found with a Markdown heading - optional guidance is available",
        diagnostic: { state: "available", httpStatus: response.status } };
    }
    return { status: "warn", detail: "llms.txt did not contain recognizable Markdown guidance",
      diagnostic: { state: "invalid_response", httpStatus: response.status } };
  } catch (error) { return fetchFailure("llms.txt", error, signal); }
}
