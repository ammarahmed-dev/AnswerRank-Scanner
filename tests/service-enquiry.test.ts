import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { validateServiceEnquiry, serviceMessage, serviceSource } from "@/lib/service-enquiry";
const { send } = vi.hoisted(() => ({ send: vi.fn(async () => ({ data: { id: "mock" }, error: null })) }));
vi.mock("@/lib/supabase-config", () => ({
  getSupabaseServerUrl: () => "https://db.example.invalid", hasSupabaseConfig: () => true,
  getSupabaseServiceHeaders: () => ({ apikey: "synthetic-service-key" }),
}));
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
import { POST } from "@/app/api/contact/route";
const service = { website: "https://example.invalid/product", platform: "webflow", engagement: "fixes", source: "report" };
const payload = { name: " Test Owner ", email: " OWNER@example.invalid ", subject: "Optimization services", message: "Please help us fix our website's schema.", service };
let ip = 0;
const request = (body: unknown) => new NextRequest("https://aeocheck.co/api/contact", {
  method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `service-test-${++ip}` },
  body: JSON.stringify(body),
});
beforeEach(() => { vi.stubEnv("RESEND_API_KEY", "synthetic"); vi.stubEnv("CONTACT_EMAIL", "owner@example.invalid"); });
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("service context validation", () => {
  it.each([undefined, null, "bad", [], 4])("rejects a missing or non-object context: %s", value => {
    expect(validateServiceEnquiry(value)).toMatchObject({ ok: false, errors: { website: expect.any(String) } });
  });
  it.each(["", "javascript:alert(1)", "ftp://example.invalid", "https://user:secret@example.invalid",
    "https://example.invalid?token=private", "https://example.invalid#private", "https://exam\nple.invalid", "https://" + "a".repeat(2048)])("rejects unsafe or malformed website: %s", website => {
    expect(validateServiceEnquiry({ ...service, website })).toMatchObject({ ok: false, errors: { website: expect.any(String) } });
  });
  it.each(["platform", "engagement", "source"])("rejects injected %s", field => {
    expect(validateServiceEnquiry({ ...service, [field]: "report\nOther: injected" })).toMatchObject({ ok: false, errors: { [field]: expect.any(String) } });
    expect(validateServiceEnquiry({ ...service, [field]: {} }).ok).toBe(false);
  });
  it("normalizes the URL and defaults optional context without fetching", () => {
    expect(validateServiceEnquiry({ website: " https://EXAMPLE.invalid " })).toEqual({ ok: true,
      value: { website: "https://example.invalid/", platform: "unsure", engagement: "unsure", source: "direct" } });
    expect(serviceSource("private-report-token")).toBe("services-page");
    expect(serviceSource("report")).toBe("report");
  });
  it("formats explicit self-reported context using controlled labels", () => {
    const result = validateServiceEnquiry(service);
    if (!result.ok) throw new Error("Invalid fixture");
    expect(serviceMessage(result.value, "Request details")).toContain("Scope preference: Website fixes sprint");
    expect(serviceMessage(result.value, "Request details")).toContain("Entry point (self-reported): report");
  });
});

describe("service enquiry persistence boundary", () => {
  it("stores service context in the existing private message and confirms the exact new ID", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const inserted = JSON.parse(init!.body as string);
      return Response.json([{ id: inserted.id }], { status: 201 });
    });
    vi.stubGlobal("fetch", fetch);
    const res = await POST(request(payload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("https://db.example.invalid/rest/v1/contact_messages?select=id");
    const init = fetch.mock.calls[0][1]!;
    expect(init.headers).toMatchObject({ Prefer: "return=representation" });
    const inserted = JSON.parse(init.body as string);
    expect(inserted).toMatchObject({ name: "Test Owner", email: "owner@example.invalid", subject: "Optimization services", status: "new" });
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(inserted.message).toContain("Website: https://example.invalid/product");
    expect(inserted.message).toContain(payload.message);
    expect(Object.keys(inserted).sort()).toEqual(["email", "id", "message", "name", "status", "subject"]);
    expect(send).toHaveBeenCalledOnce();
  });
  it.each([[], [{ id: "wrong-id" }], [{ id: "a" }, { id: "b" }], {}, null])("does not claim success for an unconfirmed save: %j", async receipt => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(receipt)));
    const res = await POST(request(payload));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("before resubmitting");
    expect(send).not.toHaveBeenCalled();
  });
  it.each([400, 500])("does not send notifications after storage status %s", async status => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("database detail must stay private", { status })));
    const res = await POST(request(payload));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("database detail");
    expect(send).not.toHaveBeenCalled();
  });
  it("handles network failure without claiming a saved enquiry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network private details"); }));
    expect((await POST(request(payload))).status).toBe(503);
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects oversized receipt bodies before a success or notification", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(16385))));
    expect((await POST(request(payload))).status).toBe(503);
    expect(send).not.toHaveBeenCalled();
  });
  it.each([{}, { service: null }, { service: { ...service, website: "https://example.invalid?token=secret" } }, { message: "x".repeat(10001) }])("validates service input before storage or email: %j", async change => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const data = Object.keys(change).length ? { ...payload, ...change } : { ...payload, service: undefined };
    expect((await POST(request(data))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled();
  });
  it("preserves ordinary contact requests and ignores service context on other subjects", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetch);
    expect((await POST(request({ ...payload, subject: "General question", service: "ignored" }))).status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe("https://db.example.invalid/rest/v1/contact_messages");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string).message).toBe(payload.message);
  });
  it("retains a confirmed saved result when the best-effort notification fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => Response.json([{ id: JSON.parse(init.body).id }])));
    send.mockRejectedValueOnce(new Error("mock mail unavailable"));
    expect((await POST(request(payload))).status).toBe(200);
  });
});
