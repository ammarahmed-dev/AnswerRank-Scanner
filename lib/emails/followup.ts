export const followupEmailSubject = "Did you check your AI visibility score yet?";

export const followupEmailHtml = (_email: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AEOCheck Follow-up</title>
</head>
<body style="margin:0;padding:0;background-color:#06090d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:24px;">
              <a href="https://www.aeocheck.co" style="text-decoration:none;">
                <span style="font-size:22px;font-weight:700;color:#00e5a0;letter-spacing:-0.5px;">AEOCheck</span>
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:28px;">
              <div style="height:1px;background:linear-gradient(90deg,#00e5a0,rgba(0,229,160,0));"></div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#0d1117;border-radius:12px;padding:40px 36px;border:1px solid rgba(255,255,255,0.06);">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.3px;">
                Your AI visibility score is waiting.
              </h1>

              <p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.65;">
                You signed up for AEOCheck 3 days ago but haven't scanned yet. Find out if ChatGPT and Perplexity can find your website - it takes 60 seconds and it's free.
              </p>

              <div style="margin:0 0 24px;background:#0a0f15;border:1px solid rgba(0,229,160,0.35);border-radius:10px;padding:14px 16px;">
                <p style="margin:0;font-size:14px;color:#d7fff3;line-height:1.5;">
                  <strong style="color:#00e5a0;">20+ checks</strong> - the signals AI engines use to understand, trust and cite a page
                </p>
              </div>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:8px;background:#00e5a0;">
                    <a href="https://www.aeocheck.co/scan"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#000000;text-decoration:none;border-radius:8px;letter-spacing:-0.1px;">
                      Check my AI visibility score &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5;">
                Already checked? Log in to see your saved reports.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.28);line-height:1.5;">
                You're receiving this because you signed up at
                <a href="https://www.aeocheck.co" style="color:rgba(255,255,255,0.28);text-decoration:none;">aeocheck.co</a>
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.22);line-height:1.5;">
                If you don't want these emails, you can ignore them - we won't send more than 2 emails total.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
