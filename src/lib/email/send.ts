// Minimal email sender. Uses Resend when RESEND_API_KEY is configured;
// otherwise reports "not sent" so callers can fall back to on-screen delivery
// (the gift card page always shows the code either way).

export interface EmailResult {
  sent: boolean;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false };

  const from =
    process.env.EMAIL_FROM ??
    "Skin 360 Face Body Scalp <hello@skin360facebodyscalp.com>";
  // The hello@ sender has no mailbox, so replies route to the salon's real
  // inbox unless a caller overrides it.
  const replyTo =
    args.replyTo ??
    process.env.EMAIL_REPLY_TO ??
    "skin360facebodyscalp@yahoo.com";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      reply_to: [replyTo],
    }),
  });
  if (!res.ok) {
    console.error("sendEmail failed:", res.status, await res.text());
    return { sent: false };
  }
  return { sent: true };
}
