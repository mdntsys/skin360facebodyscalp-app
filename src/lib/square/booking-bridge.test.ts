// Room-bridge tests encoding Carolina's Valencia room rules:
//   Head Spa Room ......... scalp only, 1 at a time
//   Body Room ............. body only, 1 at a time, preferred for body
//   Facial/Body Room ...... facials + add-ons + body overflow, capacity 2
//   Nails Room ............ ONE chair: mani, pedi, or both for one client;
//                           never two clients at once
import { describe, expect, it } from "vitest";

import type { Room } from "../../data/types";
import {
  checkSlot,
  roomCategoryForSquareCategory,
  simulateRoomAssignments,
  type BridgeBooking,
  type BridgeService,
} from "./booking-bridge";

const ROOMS: Room[] = [
  { id: "head-spa", locationId: "valencia", name: "Head Spa Room", capacity: 1, categories: ["Scalp"], sort: 1 },
  { id: "body", locationId: "valencia", name: "Body Room", capacity: 1, categories: ["Body"], sort: 2 },
  { id: "facial-body", locationId: "valencia", name: "Facial/Body Room", capacity: 2, categories: ["Facials", "Advanced Treatments", "Body", "Face Add-Ons"], sort: 3 },
  { id: "nails", locationId: "valencia", name: "Nails Room", capacity: 1, categories: ["Nails"], sort: 4 },
];

const SERVICES = new Map<string, BridgeService>([
  ["facial", { variationId: "facial", name: "Classic Facial", durationMin: 60, roomCategory: "Facials" }],
  ["body-tx", { variationId: "body-tx", name: "Lymphatic Drainage", durationMin: 60, roomCategory: "Body" }],
  ["scalp", { variationId: "scalp", name: "Signature Scalp", durationMin: 60, roomCategory: "Scalp" }],
  ["mani", { variationId: "mani", name: "Gel Manicure", durationMin: 60, roomCategory: "Nails" }],
  ["mystery", { variationId: "mystery", name: "Unmapped", durationMin: 60, roomCategory: null }],
]);

const T = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 8, 9, hour, minute)).toISOString();

function booking(
  id: string,
  serviceVariationId: string,
  startAt: string,
  teamMemberId = `staff-${id}`
): BridgeBooking {
  return { id, serviceVariationId, startAt, durationMin: 60, teamMemberId };
}

describe("simulateRoomAssignments", () => {
  it("prefers the dedicated Body Room, then overflows body into Facial/Body", () => {
    const assigned = simulateRoomAssignments(ROOMS, SERVICES, [
      booking("b1", "body-tx", T(14, 30)),
      booking("b2", "body-tx", T(14, 30)),
    ]);
    expect(assigned[0].roomId).toBe("body");
    expect(assigned[1].roomId).toBe("facial-body");
  });

  it("leaves unmapped services roomless instead of guessing", () => {
    const assigned = simulateRoomAssignments(ROOMS, SERVICES, [
      booking("m1", "mystery", T(10)),
    ]);
    expect(assigned[0].roomId).toBeUndefined();
  });
});

describe("checkSlot — Carolina's rules", () => {
  it("allows two 2:30 facials, rejects the third", () => {
    const existing = simulateRoomAssignments(ROOMS, SERVICES, [
      booking("f1", "facial", T(14, 30)),
      booking("f2", "facial", T(14, 30)),
    ]);
    const third = checkSlot(ROOMS, SERVICES, existing, {
      serviceVariationId: "facial",
      startAt: T(14, 30),
      durationMin: 60,
    });
    expect(third.ok).toBe(false);
    expect(third.roomChecked).toBe(true);
  });

  it("body treatments can fill Body Room AND overflow into Facial/Body", () => {
    const existing = simulateRoomAssignments(ROOMS, SERVICES, [
      booking("b1", "body-tx", T(14, 30)),
    ]);
    const second = checkSlot(ROOMS, SERVICES, existing, {
      serviceVariationId: "body-tx",
      startAt: T(14, 30),
      durationMin: 60,
    });
    expect(second.ok).toBe(true);
    expect(second.roomId).toBe("facial-body");
  });

  it("a facial still fits when one body treatment overflowed, but not two", () => {
    const existing = simulateRoomAssignments(ROOMS, SERVICES, [
      booking("b1", "body-tx", T(14, 30)),
      booking("b2", "body-tx", T(14, 30)), // overflows into Facial/Body (1 of 2)
    ]);
    const facial = checkSlot(ROOMS, SERVICES, existing, {
      serviceVariationId: "facial",
      startAt: T(14, 30),
      durationMin: 60,
    });
    expect(facial.ok).toBe(true); // second Facial/Body spot

    const withFacial = [
      ...existing,
      ...simulateRoomAssignments(ROOMS, SERVICES, [booking("f1", "facial", T(14, 30))]).map(
        (a) => ({ ...a, roomId: "facial-body" })
      ),
    ];
    const secondFacial = checkSlot(ROOMS, SERVICES, withFacial, {
      serviceVariationId: "facial",
      startAt: T(14, 30),
      durationMin: 60,
    });
    expect(secondFacial.ok).toBe(false); // room now truly full
  });

  it("one nail chair: a second overlapping nail client is rejected, even with a second tech", () => {
    const existing = simulateRoomAssignments(ROOMS, SERVICES, [
      booking("n1", "mani", T(11), "vero"),
    ]);
    const secondClient = checkSlot(ROOMS, SERVICES, existing, {
      serviceVariationId: "mani",
      startAt: T(11, 30),
      durationMin: 60,
    });
    expect(secondClient.ok).toBe(false);
  });

  it("the nail chair frees up when the first appointment ends", () => {
    const existing = simulateRoomAssignments(ROOMS, SERVICES, [
      booking("n1", "mani", T(11), "vero"),
    ]);
    const after = checkSlot(ROOMS, SERVICES, existing, {
      serviceVariationId: "mani",
      startAt: T(12),
      durationMin: 60,
    });
    expect(after.ok).toBe(true);
  });

  it("scalp only ever lands in the Head Spa Room", () => {
    const first = checkSlot(ROOMS, SERVICES, [], {
      serviceVariationId: "scalp",
      startAt: T(13),
      durationMin: 60,
    });
    expect(first.roomId).toBe("head-spa");

    const existing = simulateRoomAssignments(ROOMS, SERVICES, [
      booking("s1", "scalp", T(13)),
    ]);
    const second = checkSlot(ROOMS, SERVICES, existing, {
      serviceVariationId: "scalp",
      startAt: T(13, 30),
      durationMin: 60,
    });
    expect(second.ok).toBe(false);
  });

  it("unmapped services pass through with roomChecked=false", () => {
    const check = checkSlot(ROOMS, SERVICES, [], {
      serviceVariationId: "mystery",
      startAt: T(10),
      durationMin: 60,
    });
    expect(check.ok).toBe(true);
    expect(check.roomChecked).toBe(false);
  });
});

describe("roomCategoryForSquareCategory", () => {
  it("maps Carolina's Square categories, including the misspelled one", () => {
    expect(roomCategoryForSquareCategory("FACE")).toBe("Facials");
    expect(roomCategoryForSquareCategory("HEAD SPA (SCALP)")).toBe("Scalp");
    expect(roomCategoryForSquareCategory("POST-COSMETIC SUREGERY SERVICES")).toBe("Body");
    expect(roomCategoryForSquareCategory("NAIL ADD-ON SERVICES")).toBe("Nails");
    expect(roomCategoryForSquareCategory("Something New")).toBeNull();
    expect(roomCategoryForSquareCategory(undefined)).toBeNull();
  });
});
