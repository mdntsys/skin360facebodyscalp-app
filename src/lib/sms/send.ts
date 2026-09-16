export interface SmsResult {
  sent: boolean;
}

/**
 * Best-effort SMS via Twilio. Skips when env isn't set so bookings never
 * fail over a missing key. Prefer the Messaging Service SID (A2P) when present.
 */
export async function sendSms(args: {
  to: string;
  body: string;
}): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const messagingService = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim() || "+16618884698";
  if (!sid || !token) return { sent: false };
  if (!messagingService && !from) return { sent: false };

  const params = new URLSearchParams();
  params.set("To", args.to);
  params.set("Body", args.body);
  if (messagingService) params.set("MessagingServiceSid", messagingService);
  else params.set("From", from);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );
    if (!res.ok) {
      console.error("sendSms failed:", res.status, await res.text());
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("sendSms failed:", err);
    return { sent: false };
  }
}
