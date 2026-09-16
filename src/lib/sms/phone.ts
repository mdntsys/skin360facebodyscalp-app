/** US numbers to E.164. Returns null if we can't text it. */
export function toE164(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15 && raw?.trim().startsWith("+")) {
    return `+${digits}`;
  }
  return null;
}
