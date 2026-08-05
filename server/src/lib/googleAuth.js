// Google service-account auth for Cloudflare Workers.
//
// Uses a Google Cloud service account with domain-wide delegation so it can
// act as your Workspace users (create events on their calendars, send mail
// as no-reply@acadapp.in, etc). This requires:
//
//   1. A Google Cloud project with Calendar API + Gmail API enabled.
//   2. A service account, with a JSON key downloaded.
//   3. Domain-wide delegation enabled for that service account in the
//      Workspace Admin console, authorized for these scopes:
//        https://www.googleapis.com/auth/calendar
//        https://www.googleapis.com/auth/gmail.send
//   4. The service account JSON stored as a Worker secret (see wrangler.toml
//      notes) - never commit the key file itself.
//
// env.GOOGLE_SERVICE_ACCOUNT_JSON - the full service account JSON, as a string
// env.GOOGLE_IMPERSONATE_EMAIL    - Workspace user/mailbox to act as
//                                    (e.g. no-reply@acadapp.in or an admin)

import { SignJWT, importPKCS8 } from "jose";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Cache the access token in module scope for the life of the isolate.
// Workers isolates are short-lived but this still saves calls within a burst
// of requests.
let cachedToken = null;
let cachedTokenExpiry = 0;

export async function getGoogleAccessToken(env, scopes) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExpiry - 30 > now) {
    return cachedToken;
  }

  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const privateKey = await importPKCS8(serviceAccount.private_key, "RS256");

  const jwt = await new SignJWT({
    scope: scopes.join(" "),
    sub: env.GOOGLE_IMPERSONATE_EMAIL, // impersonated mailbox
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(serviceAccount.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

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
    throw new Error(`Google token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = now + data.expires_in;
  return cachedToken;
}

export const SCOPES = {
  CALENDAR: "https://www.googleapis.com/auth/calendar",
  GMAIL_SEND: "https://www.googleapis.com/auth/gmail.send",
};
