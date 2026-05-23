import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

type SubjectOption =
  | "General question"
  | "Report issue"
  | "Billing / payment"
  | "Feature request"
  | "Other";

type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

type FieldErrors = Partial<Record<keyof Required<ContactPayload>, string>>;

const ALLOWED_SUBJECTS: SubjectOption[] = [
  "General question",
  "Report issue",
  "Billing / payment",
  "Feature request",
  "Other",
];

const HOUR_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 3;
const IP_RATE_LIMIT_MAX_ENTRIES = 5_000;
const ipRateLimitStore = new Map<string, number[]>();

import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

const supabaseUrl = getSupabaseServerUrl();

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown-ip";
}

function checkRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  // Evict oldest entry when the store grows too large to prevent unbounded memory growth.
  if (ipRateLimitStore.size >= IP_RATE_LIMIT_MAX_ENTRIES) {
    const firstKey = ipRateLimitStore.keys().next().value;
    if (firstKey !== undefined) ipRateLimitStore.delete(firstKey);
  }
  const recent = (ipRateLimitStore.get(ip) ?? []).filter((ts) => now - ts < HOUR_MS);
  if (recent.length >= MAX_PER_HOUR) {
    const oldest = recent[0];
    const retryAfter = Math.max(1, Math.ceil((HOUR_MS - (now - oldest)) / 1000));
    ipRateLimitStore.set(ip, recent);
    return { ok: false, retryAfter };
  }
  recent.push(now);
  ipRateLimitStore.set(ip, recent);
  return { ok: true };
}

function validate(payload: ContactPayload): FieldErrors {
  const errors: FieldErrors = {};

  const name = payload.name?.trim() ?? "";
  if (!name || name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  const email = payload.email?.trim() ?? "";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    errors.email = "Enter a valid email address.";
  }

  const subject = payload.subject?.trim() ?? "";
  if (!ALLOWED_SUBJECTS.includes(subject as SubjectOption)) {
    errors.subject = "Select a valid subject.";
  }

  const message = payload.message?.trim() ?? "";
  if (!message || message.length < 20) {
    errors.message = "Message must be at least 20 characters.";
  }

  return errors;
}

async function sendResendNotification(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL;
  if (!resendApiKey || !contactEmail) return;

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "AEOCheck <hello@aeocheck.co>",
      to: contactEmail,
      subject: `New contact: ${data.subject} from ${data.name}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\nMessage: ${data.message}`,
    });
  } catch {
    // Silent by design. Supabase save is the source of truth.
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: rl.retryAfter ? { "Retry-After": String(rl.retryAfter) } : undefined }
    );
  }

  let body: ContactPayload = {};
  try {
    body = (await req.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const errors = validate(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const name = body.name!.trim();
  const email = body.email!.trim().toLowerCase();
  const subject = body.subject!.trim();
  const message = body.message!.trim();

  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Contact storage is not configured." },
      { status: 500 }
    );
  }

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
    method: "POST",
    headers: {
      ...getSupabaseServiceHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      name,
      email,
      subject,
      message,
      status: "new",
    }),
  });

  if (!insertRes.ok) {
    const details = await insertRes.text().catch(() => "");
    console.error("Contact form Supabase insert failed:", details);
    return NextResponse.json(
      { error: "Could not save contact message. Please try again." },
      { status: 500 }
    );
  }

  await sendResendNotification({ name, email, subject, message });
  return NextResponse.json({ success: true });
}
