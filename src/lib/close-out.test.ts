// Tests for the close-out day aggregation — mirrors Carolina's real workflow:
// per-girl payout lines with tips, per-tender totals to match terminal batches.
import { describe, expect, it } from "vitest";

import type { Payment } from "../data/types";
import { closeOutForDay } from "./close-out";

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
