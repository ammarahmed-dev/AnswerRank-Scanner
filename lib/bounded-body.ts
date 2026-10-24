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
export async function readBoundedText(source: StreamBody, maxBytes: number): Promise<string> {
  if (Number(source.headers.get("content-length")) > maxBytes) {
    await source.body?.cancel().catch(() => undefined);
    throw new BodyTooLargeError();
  }
  if (!source.body) return "";
  const reader = source.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
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
    reader.releaseLock();
  }
}
