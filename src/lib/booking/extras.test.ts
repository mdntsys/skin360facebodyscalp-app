import { describe, expect, it } from "vitest";
import type { Service } from "../../data/types";
import {
  appointmentServiceLabel,
  combinedDuration,
  combinedPrice,
  extraAttachesToMain,
  extrasForMain,
} from "./extras";

const svc = (
  over: Partial<Service> & Pick<Service, "id" | "name" | "category">
): Service => ({
  price: 40,
  durationMin: 60,
  bufferMin: 0,
  description: "",
  ...over,
});

const fills = svc({ id: "fills", name: "Nail Fills", category: "Nails", price: 60 });
const gel = svc({
  id: "gel",
  name: "Gel Manicure or Pedicure",
  category: "Nails",
  durationMin: 60,
});
const french = svc({
  id: "french",
  name: "French Tip w/Service",
  category: "Nails",
  price: 10,
  durationMin: 30,
  addonFor: ["Nails"],
});
const gold = svc({
  id: "gold",
  name: "24K Gold",
  category: "Face Add-Ons",
  price: 100,
  durationMin: 25,
  addonFor: ["Facials", "Advanced Treatments"],
});
const facial = svc({
  id: "facial",
  name: "Signature Facial",
  category: "Facials",
  price: 295,
  durationMin: 75,
});

describe("extraAttachesToMain", () => {
  it("lets a second nail main ride along (fill + pedi)", () => {
    expect(extraAttachesToMain(fills, gel)).toBe(true);
    expect(extraAttachesToMain(gel, fills)).toBe(true);
  });

  it("lets official add-ons attach", () => {
    expect(extraAttachesToMain(fills, french)).toBe(true);
    expect(extraAttachesToMain(facial, gold)).toBe(true);
  });

  it("rejects a facial bolted onto a fill, and itself", () => {
    expect(extraAttachesToMain(fills, facial)).toBe(false);
    expect(extraAttachesToMain(fills, fills)).toBe(false);
    expect(extraAttachesToMain(fills, gold)).toBe(false);
  });
});

describe("extrasForMain", () => {
  const all = [fills, gel, french, gold, facial];

  it("offers other nail mains and nail add-ons with a fill", () => {
    expect(extrasForMain(fills, all).map((s) => s.id).sort()).toEqual([
      "french",
      "gel",
    ]);
  });

  it("scopes to what the girl actually performs", () => {
    expect(
      extrasForMain(fills, all, ["fills", "gel"]).map((s) => s.id)
    ).toEqual(["gel"]);
  });
});

describe("combined totals / label", () => {
  it("adds duration and price", () => {
    expect(combinedDuration(fills, [gel, french])).toBe(150);
    expect(combinedPrice(fills, [gel, french])).toBe(110);
  });

  it("labels the visit", () => {
    const byId = new Map([
      ["fills", fills],
      ["gel", gel],
    ]);
    expect(
      appointmentServiceLabel(
        { serviceId: "fills", addonServiceIds: ["gel"] },
        byId
      )
    ).toBe("Nail Fills + Gel Manicure or Pedicure");
  });
});
