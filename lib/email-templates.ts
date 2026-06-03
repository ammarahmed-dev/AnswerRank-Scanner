/**
 * AEOCheck auth email templates.
 *
 * These are NOT sent programmatically — they are pasted into:
 *   Supabase Dashboard → Authentication → Email Templates
 *
 * Supabase injects {{ .ConfirmationURL }} automatically.
 * All CSS is inline for maximum email client compatibility.
 */

export const EMAIL_FROM = "AEOCheck <hello@aeocheck.co>";

// ─────────────────────────────────────────────────────────────────────────────
// Shared layout wrapper
// ─────────────────────────────────────────────────────────────────────────────

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AEOCheck</title>
</head>
<body style="margin:0;padding:0;background-color:#06090d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;">
              <a href="https://www.aeocheck.co" style="text-decoration:none;">
                <span style="font-size:22px;font-weight:700;color:#00e5a0;letter-spacing:-0.5px;">AEOCheck</span>
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom:32px;">
              <div style="height:1px;background:linear-gradient(90deg,#00e5a0,rgba(0,229,160,0));"></div>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background-color:#0d1117;border-radius:12px;padding:40px 36px;border:1px solid rgba(255,255,255,0.06);">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.5;">
                © 2026 AEOCheck ·
                <a href="https://www.aeocheck.co" style="color:rgba(255,255,255,0.3);text-decoration:none;">aeocheck.co</a>
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

// ─────────────────────────────────────────────────────────────────────────────
// Confirm signup
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIRM_SIGNUP_SUBJECT = "Confirm your AEOCheck account";

export const CONFIRM_SIGNUP_HTML = wrap(`
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
    Confirm your email address
  </h1>
  <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.6;">
    Thanks for signing up for AEOCheck. Click the button below to confirm your
    email address and get started scanning your AI visibility score.
  </p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="border-radius:8px;background:#00e5a0;">
        <a href="{{ .ConfirmationURL }}"
           style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#000000;text-decoration:none;border-radius:8px;letter-spacing:-0.1px;">
          Confirm my account
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:28px 0 0;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.5;">
    If you didn't create an AEOCheck account, you can safely ignore this email.
  </p>
`);

// ─────────────────────────────────────────────────────────────────────────────
// Reset password
// ─────────────────────────────────────────────────────────────────────────────

export const RESET_PASSWORD_SUBJECT = "Reset your AEOCheck password";

export const RESET_PASSWORD_HTML = wrap(`
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
    Reset your password
  </h1>
  <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.6;">
    We received a request to reset your AEOCheck password. Click the button
    below to choose a new one.
  </p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="border-radius:8px;background:#00e5a0;">
        <a href="{{ .ConfirmationURL }}"
           style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#000000;text-decoration:none;border-radius:8px;letter-spacing:-0.1px;">
          Reset my password
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:20px 0 0;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.5;">
    This link expires in 1 hour. If you didn't request a password reset,
    you can safely ignore this email - your password won't change.
  </p>
`);

// ─────────────────────────────────────────────────────────────────────────────
// Magic link
// ─────────────────────────────────────────────────────────────────────────────

export const MAGIC_LINK_SUBJECT = "Your AEOCheck login link";

export const MAGIC_LINK_HTML = wrap(`
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
    Here's your login link
  </h1>
  <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.6;">
    Click the button below to sign in to AEOCheck. This link expires in 1 hour
    and can only be used once.
  </p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="border-radius:8px;background:#00e5a0;">
        <a href="{{ .ConfirmationURL }}"
           style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#000000;text-decoration:none;border-radius:8px;letter-spacing:-0.1px;">
          Sign in to AEOCheck
        </a>
      </td>
    </tr>
  </table>
  <p style="margin:20px 0 0;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.5;">
    If you didn't request this link, you can safely ignore this email.
  </p>
`);
