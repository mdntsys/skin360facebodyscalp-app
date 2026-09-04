// Campaign opt-in copy — must match the A2P filing word for word.
export const SMS_OPT_IN_LABEL =
  "Text me about my appointment — confirmations, reminders and changes. Msg & data rates may apply. Msg frequency varies. Reply STOP to unsubscribe, HELP for help.";

/** Checking the box without a number is consent we can't use. */
export function smsOptInMissingPhone(
  optIn: boolean,
  phone?: string | null
): boolean {
  return optIn && !String(phone ?? "").trim();
}
