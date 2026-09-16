import { bookedSms, cancelledSms, reminderSms } from "./copy";
import { toE164 } from "./phone";
import { sendSms, type SmsResult } from "./send";

export type SmsKind = "booked" | "cancelled" | "reminder";

export async function sendAppointmentSms(args: {
  kind: SmsKind;
  phone?: string | null;
  optedIn: boolean;
  firstName: string;
  serviceName: string;
  startAt: string;
  staffName: string;
  locationId?: string;
}): Promise<SmsResult> {
  if (!args.optedIn) return { sent: false };
  const to = toE164(args.phone);
  if (!to) return { sent: false };
  const body =
    args.kind === "cancelled"
      ? cancelledSms({
          startAt: args.startAt,
          locationId: args.locationId,
        })
      : args.kind === "reminder"
        ? reminderSms({
            firstName: args.firstName,
            serviceName: args.serviceName,
            startAt: args.startAt,
            staffName: args.staffName,
            locationId: args.locationId,
          })
        : bookedSms({
            firstName: args.firstName,
            serviceName: args.serviceName,
            startAt: args.startAt,
            staffName: args.staffName,
          });
  return sendSms({ to, body });
}
