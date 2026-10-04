import { escapeHtml } from "@/lib/monitor-email";

export const limitReachedEmailSubject = "You've used your free AEOCheck scans this month";

export function limitReachedEmailHtml(opts: { limit: number; resetDate: string }): string {
  const limit = escapeHtml(String(opts.limit));
  const resetDate = escapeHtml(opts.resetDate);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>AEOCheck</title></head>
<body style="margin:0;padding:0;background-color:#06090d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:24px;">
              <a href="https://www.aeocheck.co" style="text-decoration:none;"><span style="font-size:22px;font-weight:700;color:#00e5a0;letter-spacing:-0.5px;">AEOCheck</span></a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0d1117;border-radius:12px;padding:36px 32px;border:1px solid rgba(255,255,255,0.06);">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">You've used all ${limit} free scans this month</h1>
              <p style="margin:0 0 16px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.65;">
                Nice work putting AEOCheck to use. Your free scans reset on ${resetDate}.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.65;">
                If you need to keep going now, a one-time full report or a Pro plan gives you unlimited scans,
                the full fix list with AI guidance, competitor comparison, PDF export and monitoring.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:8px;background:#00e5a0;">
                    <a href="https://www.aeocheck.co/pricing" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#000000;text-decoration:none;border-radius:8px;">See plans &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.6;">
                Your saved reports stay in your <a href="https://www.aeocheck.co/dashboard" style="color:#00e5a0;text-decoration:none;">dashboard</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);line-height:1.5;">
                You're receiving this because you have an AEOCheck account. We send this at most once a month.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
