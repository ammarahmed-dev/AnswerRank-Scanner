import { BodyTooLargeError, readJsonObject } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { welcomeEmailHtml, welcomeEmailSubject } from "@/lib/emails/welcome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(req);
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";

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
