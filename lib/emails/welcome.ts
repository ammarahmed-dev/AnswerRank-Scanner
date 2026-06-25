export const welcomeEmailSubject = "Welcome to AEOCheck - scan your first URL";

export const welcomeEmailHtml = (_email: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to AEOCheck</title>
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
                You're in. Let's see how visible your site is.
              </h1>

              <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.65;">
                AEOCheck checks if ChatGPT, Perplexity and other AI search engines can find and recommend your website. It takes 60 seconds.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:32px;">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;">
                    &bull; <strong style="color:#ffffff;">Scan any URL</strong> - get your AI visibility score instantly
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;border-top:1px solid rgba(255,255,255,0.06);">
                    &bull; <strong style="color:#ffffff;">Full issue breakdown</strong> - see exactly what to fix
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;border-top:1px solid rgba(255,255,255,0.06);">
                    &bull; <strong style="color:#ffffff;">Monitor over time</strong> - track your score weekly or monthly
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:8px;background:#00e5a0;">
                    <a href="https://www.aeocheck.co/scan"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#000000;text-decoration:none;border-radius:8px;letter-spacing:-0.1px;">
                      Scan your first URL &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.5;">
                You're on the <strong style="color:rgba(255,255,255,0.55);">Free plan</strong> &middot; 3 scans per month included
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.25);line-height:1.5;">
                &copy; 2026 AEOCheck &middot;
                <a href="https://www.aeocheck.co" style="color:rgba(255,255,255,0.25);text-decoration:none;">aeocheck.co</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
