// scripts/lib/gsc-auth.mjs
// Zero-dependency Google service-account auth (RS256 JWT -> OAuth access token).
// Requires env: GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY
// Note: when storing the private key as a GitHub secret, keep the literal \n
// sequences - this module converts them back to real newlines.

import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function getAccessToken() {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  let privateKey = process.env.GSC_PRIVATE_KEY;
  if (!clientEmail || !privateKey) {
    throw new Error("Missing GSC_CLIENT_EMAIL or GSC_PRIVATE_KEY env vars");
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claims}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsigned), privateKey)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.access_token;
}
