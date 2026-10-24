export class BodyTooLargeError extends Error {
  constructor() {
    super("Response body exceeds the allowed byte limit.");
    this.name = "BodyTooLargeError";
  }
}

export type StreamBody = {
  headers: { get(name: string): string | null };
  body: {
    cancel(reason?: unknown): Promise<void>;
    getReader(): {
      read(): Promise<{ done: boolean; value?: Uint8Array }>;
      cancel(reason?: unknown): Promise<void>;
      releaseLock(): void;
    };
  } | null;
};

/** Counts decoded bytes, including chunked and decompressed fetch responses. */
export async function readBoundedText(source: StreamBody, maxBytes: number, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) {
    await source.body?.cancel().catch(() => undefined);
    signal.throwIfAborted();
  }
  if (Number(source.headers.get("content-length")) > maxBytes) {
    await source.body?.cancel().catch(() => undefined);
    throw new BodyTooLargeError();
  }
  if (!source.body) return "";
  const reader = source.body.getReader();
  const abort = () => { void reader.cancel(signal?.reason).catch(() => undefined); };
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      if (!value) continue;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new BodyTooLargeError();
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}

/** Reject non-object JSON at the boundary before field access, auth or paid work. */
export async function readJsonObject(source: StreamBody, maxBytes = 32_768): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(await readBoundedText(source, maxBytes));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body must be a JSON object.");
  return value as Record<string, unknown>;
}
