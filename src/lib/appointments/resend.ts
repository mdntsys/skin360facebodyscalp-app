import { toE164 } from "../sms/phone";

export interface ResendPlan {
  email: boolean;
  sms: boolean;
  /** Why a channel was skipped. Empty when both go out. */
  skipped: string[];
}

export function resendPlan(args: {
  status: string;
  email?: string | null;
  phone?: string | null;
  smsOptIn: boolean;
}): ResendPlan {
  if (args.status === "cancelled" || args.status === "no-show") {
    return { email: false, sms: false, skipped: ["not-active"] };
  }
  const skipped: string[] = [];
  const email = Boolean(args.email?.includes("@"));
  if (!email) skipped.push("no-email");
  const sms = args.smsOptIn && Boolean(toE164(args.phone));
  if (!args.smsOptIn) skipped.push("not-opted-in");
  else if (!toE164(args.phone)) skipped.push("no-phone");
  return { email, sms, skipped };
}
