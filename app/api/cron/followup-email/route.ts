import { NextResponse } from "next/server";
import { Resend } from "resend";
import { followupEmailHtml, followupEmailSubject } from "@/lib/emails/followup";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
};

const supabaseUrl = getSupabaseServerUrl();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: "RESEND_API_KEY missing" });
  }

  const headers = getSupabaseServiceHeaders();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const profilesRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?welcome_email_sent=eq.true&followup_email_sent=eq.false&created_at=lt.${encodeURIComponent(threeDaysAgo)}&select=id,email`,
    { headers, cache: "no-store" }
  );

  if (!profilesRes.ok) {
    const detail = await profilesRes.text().catch(() => "");
    console.error("[cron/followup-email] profiles query failed:", detail);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const profiles = (await profilesRes.json()) as ProfileRow[];
  const resend = new Resend(resendApiKey);

  let sent = 0;
  let skipped = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;

    const scansRes = await fetch(
      `${supabaseUrl}/rest/v1/reports?user_id=eq.${profile.id}&select=id&limit=1`,
      { headers, cache: "no-store" }
    );

    if (!scansRes.ok) {
      const detail = await scansRes.text().catch(() => "");
      console.error(`[cron/followup-email] scan check failed for ${profile.id}:`, detail);
      continue;
    }

    const scans = (await scansRes.json()) as Array<{ id: string }>;

    if (scans.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ followup_email_sent: true }),
      }).catch((err) => console.error(`[cron/followup-email] mark skipped failed for ${profile.id}:`, err));

      skipped++;
      continue;
    }

    const markRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ followup_email_sent: true }),
    });

    if (!markRes.ok) {
      const detail = await markRes.text().catch(() => "");
      console.error(`[cron/followup-email] mark sent failed for ${profile.id}:`, detail);
      continue;
    }

    try {
      await resend.emails.send({
        from: "AEOCheck <hello@aeocheck.co>",
        to: profile.email,
        subject: followupEmailSubject,
        html: followupEmailHtml(profile.email),
      });
      sent++;
    } catch (err) {
      console.error(`[cron/followup-email] send failed for ${profile.id}:`, err);
    }

    await sleep(200);
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
