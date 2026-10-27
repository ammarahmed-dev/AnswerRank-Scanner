import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

/** One attempt only: a lost mutation response may follow a committed transaction. */
export async function requestBillingJson(path: string, init: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController();
  const { signal } = controller;
  const timer = setTimeout(() => controller.abort(), 10_000);
  const unavailable = () => new Error("Billing storage request is unavailable.");
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(unavailable());
    signal.addEventListener("abort", onAbort, { once: true });
  });
  const work = async () => {
    const response = await fetch(`${getSupabaseServerUrl()}${path}`, {
      ...init, headers: getSupabaseServiceHeaders(), cache: "no-store", redirect: "error", signal,
    });
    if (signal.aborted || !response.ok || response.redirected) {
      void response.body?.cancel().catch(() => undefined);
      throw unavailable();
    }
    const text = await readBoundedText(response, 16_384, signal);
    signal.throwIfAborted();
    return JSON.parse(text) as unknown;
  };
  try {
    // The race bounds stalled transports/body cancellation even if they ignore abort.
    return await Promise.race([work(), aborted]);
  } catch {
    throw unavailable();
  } finally {
    clearTimeout(timer);
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}
