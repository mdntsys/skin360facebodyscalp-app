import { describe, expect, it } from "vitest";

import type { Payment, StaffMember } from "../../data/types";
import { commissionForRange } from "./commission";

const START = new Date("2027-08-09T00:00:00");
const END = new Date("2027-08-16T00:00:00");

function staff(partial: Partial<StaffMember> & { id: string; name: string }): StaffMember {
  return {
    role: "Esthetician",
    initials: "X",
    color: "#000",
    locations: ["valencia"],
    email: "",
    phone: "",
    bookable: true,
    employmentType: "contractor-1099",
    serviceIds: [],
    commissionRate: 0.45,
    tipRate: 1,
    ...partial,
  };
}

function pay(partial: Partial<Payment>): Payment {
  return {
    id: partial.id ?? "p1",
    clientId: "c1",
    dateISO: "2027-08-10T18:00:00.000Z",
    description: "",
    method: "Cash",
    subtotal: 0,
    tip: 0,
    tax: 0,
    total: 0,
    locationId: "valencia",
    kind: "service",
    ...partial,
  };
}

describe("commissionForRange", () => {
  it("pays each girl her service percent plus all of her tips", () => {
    const rows = commissionForRange(
      [
        pay({
          id: "v",
          staffId: "staff-vero",
          subtotal: 100,
          tip: 20,
          total: 120,
        }),
        pay({
          id: "k",
          staffId: "staff-karen",
          subtotal: 200,
          tip: 10,
          total: 210,
        }),
      ],
      [],
      [
        staff({ id: "staff-vero", name: "Vero", commissionRate: 0.85 }),
        staff({ id: "staff-karen", name: "Karen", commissionRate: 0.45 }),
      ],
      START,
      END
    );
    const vero = rows.find((r) => r.staffId === "staff-vero")!;
    const karen = rows.find((r) => r.staffId === "staff-karen")!;
    expect(vero.commission).toBe(85);
    expect(vero.tipPay).toBe(20);
    expect(vero.totalPay).toBe(105);
    expect(karen.commission).toBe(90);
    expect(karen.tipPay).toBe(10);
    expect(karen.totalPay).toBe(100);
  });

  it("does not count visits that have not been checked out", () => {
    const rows = commissionForRange(
      [],
      [
        {
          id: "a1",
          clientId: "c1",
          serviceId: "svc-classic-facial",
          staffId: "staff-josseline",
          locationId: "valencia",
          startISO: "2027-08-10T17:00:00.000Z",
          durationMin: 55,
          price: 145,
          status: "confirmed",
        },
      ],
      [staff({ id: "staff-josseline", name: "Josseline", commissionRate: 0.45 })],
      START,
      END
    );
    expect(rows[0].commission).toBe(0);
    expect(rows[0].outstandingCount).toBe(1);
  });
});
