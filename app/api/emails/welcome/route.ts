import { NextResponse } from "next/server";
import { Resend } from "resend";
import { welcomeEmailHtml, welcomeEmailSubject } from "@/lib/emails/welcome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WelcomePayload = {
  email?: string;
  userId?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: WelcomePayload = {};
  try {
    body = (await req.json()) as WelcomePayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const userId = body.userId?.trim() ?? "";

  if (!email || !userId || !isValidEmail(email)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[welcome-email] RESEND_API_KEY missing; skipping send");
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "AEOCheck <hello@aeocheck.co>",
      to: email,
      subject: welcomeEmailSubject,
      html: welcomeEmailHtml(email),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[welcome-email] send failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
