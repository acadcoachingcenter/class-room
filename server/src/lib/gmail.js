// Gmail API sender for ACAD-branded notifications, on top of Calendar's own
// invite emails. Sends as env.GOOGLE_IMPERSONATE_EMAIL (e.g. no-reply@acadapp.in).

import { getGoogleAccessToken, SCOPES } from "./googleAuth";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildMime({ from, to, subject, html }) {
  const headers = [
    `From: ACAD <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
  ].join("\r\n");

  return `${headers}\r\n\r\n${html}`;
}

/**
 * Send one HTML email via Gmail API.
 * @param {object} env
 * @param {{to: string, subject: string, html: string}} message
 */
export async function sendEmail(env, { to, subject, html }) {
  const token = await getGoogleAccessToken(env, [SCOPES.GMAIL_SEND]);
  const raw = toBase64Url(
    buildMime({ from: env.GOOGLE_IMPERSONATE_EMAIL, to, subject, html })
  );

  const res = await fetch(`${GMAIL_API}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) throw new Error(`Gmail send failed (${res.status}): ${await res.text()}`);
  return res.json();
}

/**
 * Send the same email to multiple recipients individually (so each "To"
 * header only shows that one person - no reply-all surprises).
 */
export async function sendEmailToMany(env, recipients, { subject, html }) {
  const results = await Promise.allSettled(
    recipients.map((to) => sendEmail(env, { to, subject, html }))
  );
  return results;
}
