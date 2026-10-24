import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, send, scan } = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ user: { id: "owner-id", email: "owner@example.invalid" }, plan: "pro" })),
  send: vi.fn(async () => ({ data: { id: "mock-email" }, error: null })),
  scan: vi.fn(),
}));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: auth }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", hasSupabaseConfig: () => true, getSupabaseServiceHeaders: () => ({}) }));
vi.mock("@/lib/scan-core", () => ({ runScanCore: scan }));
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as contact } from "@/app/api/contact/route";
import { POST as welcome } from "@/app/api/emails/welcome/route";
import { PATCH as monitor } from "@/app/api/monitor/[id]/route";
import { POST as audit } from "@/app/api/audit/[id]/scan/route";

const context = () => ({ params: Promise.resolve({ id: "saved-id" }) });
let ip = 0;
function request(raw: string, method = "POST", headers?: Record<string, string>) {
  return new NextRequest("https://aeocheck.co/api/test", {
    method, body: raw,
    headers: { "content-type": "application/json", "x-forwarded-for": `test-${++ip}`, authorization: "Bearer internal-test", ...headers },
  });
}
const validContact = { name: "Test Owner", email: "owner@example.invalid", subject: "General question", message: "A valid synthetic contact message." };
const routes = [
  { name: "checkout", run: (req: NextRequest) => checkout(req), valid: { plan: "pro" }, authenticated: true },
  { name: "contact", run: (req: NextRequest) => contact(req), valid: validContact, authenticated: false },
  { name: "welcome", run: (req: NextRequest) => welcome(req), valid: { email: "owner@example.invalid", userId: "owner-id" }, authenticated: true },
  { name: "monitor", run: (req: NextRequest) => monitor(req, context()), valid: { frequency: "monthly" }, authenticated: true },
  { name: "audit scan", run: (req: NextRequest) => audit(req, context()), valid: { url: "https://example.invalid/" }, authenticated: true },
];

beforeEach(() => {
  vi.stubEnv("INTERNAL_API_SECRET", "internal-test");
  vi.stubEnv("RESEND_API_KEY", "mock-resend");
  vi.stubEnv("CONTACT_EMAIL", "owner@example.invalid");
  vi.stubEnv("LEMONSQUEEZY_STORE_ID", "mock-store");
  vi.stubEnv("LEMONSQUEEZY_VARIANT_PRO", "mock-pro");
  vi.stubEnv("LEMONSQUEEZY_API_KEY", "mock-api");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe.each(routes)("$name request boundary", ({ run, valid, authenticated, name }) => {
  it.each(["null", "[]", '"string"', "true", "42", "{bad json", ""])("rejects %s without downstream work", async raw => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await run(request(raw))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(scan).not.toHaveBeenCalled();
  });

  it("rejects decoded multibyte payloads over 32 KiB without a Content-Length", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const raw = JSON.stringify({ ...valid, padding: "é".repeat(17_000) });
    expect(raw.length).toBeLessThan(32_768);
    expect((await run(request(raw))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(scan).not.toHaveBeenCalled();
  });

  it("cancels a chunked request after crossing the byte limit", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const cancel = vi.fn();
    const stream = new ReadableStream({
      pull(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(17_000))); },
      cancel,
    });
    const req = new NextRequest("https://aeocheck.co/api/test", {
      method: "POST", body: stream, duplex: "half",
      headers: { authorization: "Bearer internal-test", "x-forwarded-for": `test-${++ip}` },
    });
    expect((await run(req)).status).toBe(413);
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  if (authenticated) it("keeps authentication ahead of body consumption", async () => {
    if (name === "welcome") vi.stubEnv("INTERNAL_API_SECRET", "different-secret");
    else auth.mockResolvedValueOnce({ user: null, plan: "free" } as never);
    const req = request(JSON.stringify(valid));
    expect((await run(req)).status).toBe(401);
    expect(req.bodyUsed).toBe(false);
  });
});

it.each(["name", "email", "subject", "message"])("rejects non-string contact %s rather than throwing", async field => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const res = await contact(request(JSON.stringify({ ...validContact, [field]: { injected: "value" } })));
  expect(res.status).toBe(400);
  expect((await res.json()).errors).toHaveProperty(field);
  expect(fetch).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

it.each(["email", "userId"])("rejects non-string welcome %s before sending", async field => {
  expect((await welcome(request(JSON.stringify({ email: "a@example.invalid", userId: "id", [field]: 99 })))).status).toBe(400);
  expect(send).not.toHaveBeenCalled();
});

it("retains checkout variant selection and return URL for a valid request", async () => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ data: { attributes: { url: "https://checkout.example.invalid/" } } }));
  vi.stubGlobal("fetch", fetch);
  const res = await checkout(request('{"plan":"pro"}'));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ checkoutUrl: "https://checkout.example.invalid/" });
  const payload = JSON.parse(fetch.mock.calls[0][1]!.body as string);
  expect(payload.data.relationships.variant.data.id).toBe("mock-pro");
  expect(payload.data.attributes.checkout_data.custom.user_id).toBe("owner-id");
  expect(payload.data.attributes.product_options.redirect_url).toMatch(/\/dashboard\?upgraded=1$/);
});

it("keeps the owner predicate and frequency on a valid monitor update", async () => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  expect((await monitor(request('{"frequency":"monthly"}', "PATCH"), context())).status).toBe(204);
  expect(fetch.mock.calls[0][0]).toContain("user_id=eq.owner-id");
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ frequency: "monthly" });
});

it("retains the saved-audit ownership lookup for valid page input", async () => {
  const fetch = vi.fn(async (_url: string) => Response.json([]));
  vi.stubGlobal("fetch", fetch);
  expect((await audit(request('{"url":"https://example.invalid/"}'), context())).status).toBe(404);
  expect(fetch.mock.calls[0][0]).toContain("user_id=eq.owner-id");
  expect(scan).not.toHaveBeenCalled();
});

it("retains contact normalization and persistence with a mocked notification", async () => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 201 }));
  vi.stubGlobal("fetch", fetch);
  expect((await contact(request(JSON.stringify({ ...validContact, name: "  Test Owner  ", email: " OWNER@example.invalid " })))).status).toBe(200);
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({ name: "Test Owner", email: "owner@example.invalid", status: "new" });
  expect(send).toHaveBeenCalledOnce();
});

it("retains welcome normalization with a mocked email provider", async () => {
  expect((await welcome(request('{"email":" OWNER@example.invalid ","userId":" owner-id "}'))).status).toBe(200);
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.invalid" }));
});
