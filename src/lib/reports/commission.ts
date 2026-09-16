import type { Appointment, Payment, StaffMember } from "../../data/types";
import { closeOutForRange, type StaffDay } from "../close-out";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CommissionRow {
  staffId: string;
  name: string;
  role: string;
  services: number;
  serviceTotal: number;
  commissionRate: number;
  commission: number;
  tipTotal: number;
  tipRate: number;
  tipPay: number;
  totalPay: number;
  outstandingCount: number;
}

export function commissionForRange(
  payments: Payment[],
  appointments: Appointment[],
  staff: StaffMember[],
  start: Date,
  endExclusive: Date
): CommissionRow[] {
  const close = closeOutForRange(payments, appointments, start, endExclusive);
  const byId = new Map(close.byStaff.map((s) => [s.staffId, s]));
  const bookable = staff.filter((s) => s.bookable);
  return bookable
    .map((s) => rowFor(s, byId.get(s.id)))
    .sort((a, b) => b.totalPay - a.totalPay || a.name.localeCompare(b.name));
}

function rowFor(staff: StaffMember, day?: StaffDay): CommissionRow {
  const serviceTotal = day?.serviceTotal ?? 0;
  const tipTotal = day?.tipTotal ?? 0;
  const commissionRate = staff.commissionRate ?? 0;
  const tipRate = staff.tipRate ?? 1;
  const commission = round2(serviceTotal * commissionRate);
  const tipPay = round2(tipTotal * tipRate);
  return {
    staffId: staff.id,
    name: staff.name,
    role: staff.role,
    services: day?.lines.filter((l) => l.checkedOut).length ?? 0,
    serviceTotal,
    commissionRate,
    commission,
    tipTotal,
    tipRate,
    tipPay,
    totalPay: round2(commission + tipPay),
    outstandingCount: day?.outstandingCount ?? 0,
  };
}
