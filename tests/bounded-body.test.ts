import { describe, expect, it, vi } from "vitest";
import { BodyTooLargeError, readBoundedText } from "@/lib/bounded-body";

describe("bounded response reads", () => {
  it("counts decoded bytes across chunks and cancels an oversized stream", async () => {
    const cancel = vi.fn();
    let chunk = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new TextEncoder().encode(++chunk === 1 ? "éé" : "abc")); },
      cancel,
    }, { highWaterMark: 0 });
    await expect(readBoundedText({ body, headers: new Headers() }, 6)).rejects.toBeInstanceOf(BodyTooLargeError);
    expect(chunk).toBe(2);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("rejects an oversized advertised length before consuming the body", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    await expect(readBoundedText({ body, headers: new Headers({ "content-length": "100" }) }, 10)).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("preserves UTF-8 characters split across chunks at the limit", async () => {
    const bytes = new TextEncoder().encode("a€");
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes.slice(0, 2)); c.enqueue(bytes.slice(2)); c.close(); } });
    expect(await readBoundedText({ body, headers: new Headers() }, 4)).toBe("a€");
  });
});
