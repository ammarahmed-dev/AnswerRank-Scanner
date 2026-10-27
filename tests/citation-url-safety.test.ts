import { afterEach, describe, expect, it, vi } from "vitest";
const { transport, lookup } = vi.hoisted(() => ({ transport: vi.fn(), lookup: vi.fn() }));
vi.mock("undici", () => ({ Agent: class {}, fetch: transport }));
vi.mock("dns/promises", () => ({ lookup }));
import { verifyCitationDestinations } from "@/lib/citation-destinations";
afterEach(() => vi.resetAllMocks());

describe("citation checker uses real safe-fetch URL and redirect validation", () => {
  it.each(["http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest", "https://user:pass@8.8.8.8/", "https://8.8.8.8:22/"])("never dispatches %s", async url => {
    expect(await verifyCitationDestinations([url])).toEqual([{ sourceUrl: url, state: "unverified", reason: "request_failed" }]);
    expect(transport).not.toHaveBeenCalled();
  });
  it("rejects private DNS resolution before transport", async () => {
    lookup.mockResolvedValue([{ address: "10.0.0.1" }]);
    expect((await verifyCitationDestinations(["https://unsafe.example/"]))[0].state).toBe("unverified");
    expect(transport).not.toHaveBeenCalled();
  });
  it("blocks a redirect into a private address and cancels the intermediate response", async () => {
    const intermediate = new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } });
    transport.mockResolvedValue(intermediate);
    const result = await verifyCitationDestinations(["https://8.8.8.8/start"]);
    expect(result[0]).toMatchObject({ state: "unverified", reason: "request_failed" });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][1]).toMatchObject({ method: "HEAD", redirect: "manual" });
  });
  it("follows at most three validated redirect hops without reading bodies", async () => {
    transport.mockImplementation(async () => new Response(null, { status: 302, headers: { location: "/next" } }));
    expect((await verifyCitationDestinations(["https://8.8.8.8/start"]))[0].reason).toBe("request_failed");
    expect(transport).toHaveBeenCalledTimes(4);
  });
});
