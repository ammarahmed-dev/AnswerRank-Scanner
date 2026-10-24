export class CountUnavailableError extends Error {
  constructor() { super("Usage verification is temporarily unavailable."); this.name = "CountUnavailableError"; }
}

/** Enforcing a limit requires an exact count; missing/failed counts cannot mean zero. */
export async function fetchExactCount(url: string, init: RequestInit): Promise<number> {
  let response: Response | undefined;
  try {
    const timeout = AbortSignal.timeout(10_000);
    response = await fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
    if (!response.ok) throw new CountUnavailableError();
    const match = response.headers.get("content-range")?.match(/^(?:\*|\d+-\d+)\/(\d+)$/);
    const count = match ? Number(match[1]) : NaN;
    if (!Number.isSafeInteger(count) || count < 0) throw new CountUnavailableError();
    return count;
  } catch {
    throw new CountUnavailableError();
  } finally {
    await response?.body?.cancel().catch(() => undefined);
  }
}
