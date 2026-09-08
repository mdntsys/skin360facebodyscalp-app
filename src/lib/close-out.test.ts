// Tests for the close-out day aggregation — mirrors Carolina's real workflow:
// per-girl payout lines with tips, per-tender totals to match terminal batches.
import { describe, expect, it } from "vitest";

import type { Appointment, Payment } from "../data/types";
import { closeOutForDay, closeOutForWeek } from "./close-out";

const DAY = new Date("2027-08-09T12:00:00");

let seq = 0;
function pay(partial: Partial<Payment>): Payment {
  seq += 1;
  return {
    id: `pay-${seq}`,
    clientId: "client-1",
    dateISO: "2027-08-09T18:30:00.000Z",
    description: "",
    method: "GoDaddy Terminal",
    subtotal: 0,
    tip: 0,
    tax: 0,
    total: 0,
    locationId: "valencia",
    kind: "service",
    ...partial,
  };
}

describe("closeOutForDay", () => {
  it("groups service payments per girl with service, tip, and line totals", () => {
    const payments = [
      pay({ staffId: "staff-alyssia", subtotal: 200, tip: 20, total: 220 }),
      pay({ staffId: "staff-alyssia", subtotal: 145, tip: 0, total: 145 }),
      pay({ staffId: "staff-vero", subtotal: 40, tip: 10, total: 50, method: "Square Terminal" }),
    ];
    const day = closeOutForDay(payments, DAY);
    const alyssia = day.byStaff.find((s) => s.staffId === "staff-alyssia");
    const vero = day.byStaff.find((s) => s.staffId === "staff-vero");
    expect(alyssia).toMatchObject({ serviceTotal: 345, tipTotal: 20, total: 365 });
    expect(alyssia?.lines).toHaveLength(2);
    expect(vero).toMatchObject({ serviceTotal: 40, tipTotal: 10, total: 50 });
    expect(day.serviceTotal).toBe(385);
    expect(day.tipTotal).toBe(30);
    expect(day.grandTotal).toBe(415);
  });

  it("splits tender totals so each terminal batch can be matched", () => {
    const payments = [
      pay({ staffId: "s1", subtotal: 100, tip: 20, total: 120 }),
      pay({ staffId: "s2", subtotal: 75, total: 75, method: "Square Terminal" }),
      pay({ staffId: "s1", subtotal: 30, total: 30, method: "Cash" }),
      pay({ staffId: "s2", subtotal: 50, total: 50 }),
    ];
    const { methodTotals } = closeOutForDay(payments, DAY);
    const byMethod = Object.fromEntries(methodTotals.map((m) => [m.method, m.total]));
    expect(byMethod).toEqual({
      "GoDaddy Terminal": 170,
      "Square Terminal": 75,
      Cash: 30,
    });
  });

  it("keeps package purchases out of per-girl lines but in the day's money", () => {
    const payments = [
      pay({ staffId: "s1", subtotal: 145, total: 145 }),
      pay({ kind: "package", subtotal: 1232.5, total: 1232.5, description: "Series of 10 — Classic Facial" }),
    ];
    const day = closeOutForDay(payments, DAY);
    expect(day.byStaff).toHaveLength(1);
    expect(day.packagesSold).toHaveLength(1);
    expect(day.grandTotal).toBe(1377.5);
    const byMethod = Object.fromEntries(day.methodTotals.map((m) => [m.method, m.total]));
    expect(byMethod["GoDaddy Terminal"]).toBe(1377.5);
  });

  it("handles a package-session visit: $0 service, tip still credited and tendered", () => {
    const payments = [
      pay({ staffId: "s1", subtotal: 0, tip: 20, total: 20, method: "Cash", clientPackageId: "cp-1" }),
      pay({ staffId: "s1", subtotal: 0, tip: 0, total: 0, method: "None", clientPackageId: "cp-2" }),
    ];
    const day = closeOutForDay(payments, DAY);
    const s1 = day.byStaff.find((s) => s.staffId === "s1");
    expect(s1?.lines).toHaveLength(2);
    expect(s1?.tipTotal).toBe(20);
    // zero-total redemption never shows up as a tender
    expect(day.methodTotals).toEqual([{ method: "Cash", total: 20 }]);
  });

  it("only counts the requested day", () => {
    const payments = [
      pay({ staffId: "s1", subtotal: 100, total: 100 }),
      pay({ staffId: "s1", subtotal: 999, total: 999, dateISO: "2027-08-10T18:00:00.000Z" }),
    ];
    const day = closeOutForDay(payments, DAY);
    expect(day.grandTotal).toBe(100);
  });

  it("rounds accumulated floats to cents", () => {
    const payments = [
      pay({ staffId: "s1", subtotal: 0.1, total: 0.1 }),
      pay({ staffId: "s1", subtotal: 0.2, total: 0.2 }),
    ];
    const day = closeOutForDay(payments, DAY);
    expect(day.serviceTotal).toBe(0.3);
    expect(day.byStaff[0].serviceTotal).toBe(0.3);
  });
});

function appt(
  partial: Partial<Appointment> &
    Pick<Appointment, "id" | "staffId" | "startISO" | "price">
): Appointment {
  return {
    clientId: "client-1",
    serviceId: "svc-1",
    locationId: "valencia",
    durationMin: 60,
    status: "confirmed",
    ...partial,
  };
}

describe("unchecked visits on the report", () => {
  it("lists unchecked visits on the girl but not in payout totals", () => {
    const payments = [
      pay({
        staffId: "staff-vero",
        appointmentId: "a-paid",
        subtotal: 40,
        total: 40,
      }),
    ];
    const appointments = [
      appt({
        id: "a-paid",
        staffId: "staff-vero",
        startISO: "2027-08-09T19:00:00.000Z",
        price: 40,
        status: "completed",
      }),
      appt({
        id: "a-open",
        staffId: "staff-vero",
        startISO: "2027-08-09T21:00:00.000Z",
        price: 75,
      }),
    ];
    const day = closeOutForDay(payments, DAY, appointments);
    const vero = day.byStaff.find((s) => s.staffId === "staff-vero");
    expect(vero?.lines).toHaveLength(2);
    expect(vero?.lines.filter((l) => !l.checkedOut)).toHaveLength(1);
    expect(vero?.total).toBe(40);
    expect(vero?.outstandingCount).toBe(1);
    expect(vero?.outstandingBooked).toBe(75);
    expect(day.grandTotal).toBe(40);
    expect(day.outstandingCount).toBe(1);
  });

  it("still shows a girl who only has unchecked visits", () => {
    const appointments = [
      appt({
        id: "a-karen",
        staffId: "staff-karen",
        startISO: "2027-08-09T18:30:00.000Z",
        price: 195,
      }),
    ];
    const day = closeOutForDay([], DAY, appointments);
    expect(day.byStaff).toHaveLength(1);
    expect(day.byStaff[0].staffId).toBe("staff-karen");
    expect(day.byStaff[0].total).toBe(0);
    expect(day.byStaff[0].outstandingCount).toBe(1);
    expect(day.grandTotal).toBe(0);
  });

  it("skips cancelled visits", () => {
    const appointments = [
      appt({
        id: "a-cx",
        staffId: "staff-vero",
        startISO: "2027-08-09T18:30:00.000Z",
        price: 40,
        status: "cancelled",
      }),
    ];
    const day = closeOutForDay([], DAY, appointments);
    expect(day.byStaff).toHaveLength(0);
    expect(day.outstandingCount).toBe(0);
  });
});

describe("closeOutForWeek", () => {
  it("rolls Mon–Sun onto one per-girl total", () => {
    // 2027-08-09 is a Monday.
    const payments = [
      pay({
        staffId: "staff-dom",
        subtotal: 195,
        tip: 20,
        total: 215,
        dateISO: "2027-08-09T18:00:00.000Z",
      }),
      pay({
        staffId: "staff-dom",
        subtotal: 250,
        total: 250,
        dateISO: "2027-08-11T18:00:00.000Z",
      }),
      pay({
        staffId: "staff-vero",
        subtotal: 40,
        total: 40,
        dateISO: "2027-08-14T18:00:00.000Z",
      }),
    ];
    const appointments = [
      appt({
        id: "a-wed-open",
        staffId: "staff-dom",
        startISO: "2027-08-11T20:00:00.000Z",
        price: 245,
      }),
    ];
    const week = closeOutForWeek(payments, appointments, DAY);
    const dom = week.byStaff.find((s) => s.staffId === "staff-dom");
    const vero = week.byStaff.find((s) => s.staffId === "staff-vero");
    expect(dom?.total).toBe(465);
    expect(dom?.outstandingCount).toBe(1);
    expect(vero?.total).toBe(40);
    expect(week.grandTotal).toBe(505);
    expect(week.outstandingCount).toBe(1);
  });

  it("does not pull in the following Monday", () => {
    const payments = [
      pay({
        staffId: "s1",
        subtotal: 100,
        total: 100,
        dateISO: "2027-08-15T18:00:00.000Z",
      }),
      pay({
        staffId: "s1",
        subtotal: 9,
        total: 9,
        dateISO: "2027-08-16T18:00:00.000Z",
      }),
    ];
    const week = closeOutForWeek(payments, [], DAY);
    expect(week.grandTotal).toBe(100);
  });
});
