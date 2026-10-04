import { Resend } from "resend";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";
import { limitReachedEmailHtml, limitReachedEmailSubject } from "@/lib/emails/limit-reached";

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonthLabel(date: Date): string {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

/**
 * Sends the "free scan limit reached" email at most once per calendar month per user.
 * The month is claimed in the profile before sending, so concurrent blocked requests do not
 * send duplicates. Requires the `limit_email_month` column (migration 20261003_limit_email.sql);
 * without it nothing is sent.
 */
export async function maybeSendLimitReachedEmail(user: { id: string; email?: string }, limit: number, now = new Date()): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !user.email || !hasSupabaseConfig()) return false;

  const supabaseUrl = getSupabaseServerUrl();
  const month = monthKey(now);
  const profileFilter = `id=eq.${encodeURIComponent(user.id)}`;

  try {
    // Claim this month atomically: only update rows that have not been emailed this month.
    const claim = await fetch(
      `${supabaseUrl}/rest/v1/profiles?${profileFilter}&or=(limit_email_month.is.null,limit_email_month.neq.${month})`,
      {
        method: "PATCH",
        headers: { ...getSupabaseServiceHeaders(), Prefer: "return=representation" },
        body: JSON.stringify({ limit_email_month: month }),
      }
    );
    if (!claim.ok) return false; // e.g. column not migrated yet
    const claimed = (await claim.json()) as unknown[];
    if (!Array.isArray(claimed) || claimed.length === 0) return false; // already sent this month

    await new Resend(apiKey).emails.send({
      from: "AEOCheck <hello@aeocheck.co>",
      to: user.email,
      subject: limitReachedEmailSubject,
      html: limitReachedEmailHtml({ limit, resetDate: nextMonthLabel(now) }),
    });
    return true;
  } catch (err) {
    console.error("[limit-email] failed:", err instanceof Error ? err.message : "unknown error");
    return false;
  }
}
