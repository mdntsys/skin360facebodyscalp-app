import { describe, expect, it } from "vitest";
import type { Service } from "../../data/types";
import {
  filterServiceGroups,
  FREE_CONSULTATION_ID,
  groupServicesForPicker,
  isPostCosmeticService,
  POST_COSMETIC_HEADING,
} from "./service-picker";

const svc = (
  over: Partial<Service> & Pick<Service, "id" | "name" | "category">
): Service => ({
  price: 100,
  durationMin: 60,
  bufferMin: 0,
  description: "",
  ...over,
});

const consult = svc({
  id: FREE_CONSULTATION_ID,
  name: "Free Consultation",
  category: "Body",
  price: 0,
  durationMin: 15,
  onlineBookable: false,
});
const postBody = svc({
  id: "svc-post-op-body",
  name: "Post Cosmetic Surgery — Body",
  category: "Body",
  price: 245,
});
const postFace = svc({
  id: "svc-post-op-face",
  name: "Post-Cosmetic Surgery — Face",
  category: "Body",
  price: 170,
  durationMin: 45,
});
const lymphatic = svc({
  id: "svc-lymphatic",
  name: "Brazilian Lymphatic Drainage",
  category: "Body",
  price: 180,
});
const gel = svc({
  id: "svc-gel",
  name: "Gel Manicure",
  category: "Nails",
  price: 55,
});
const facial = svc({
  id: "svc-signature-facial",
  name: "Signature Customized Facial",
  category: "Facials",
  price: 295,
  durationMin: 75,
});

describe("isPostCosmeticService", () => {
  it("matches the consult by id even though the name has no Post", () => {
    expect(isPostCosmeticService(consult)).toBe(true);
    expect(isPostCosmeticService(lymphatic)).toBe(false);
  });

  it("matches names that start with Post-Cosmetic or Post Cosmetic", () => {
    expect(isPostCosmeticService(postBody)).toBe(true);
    expect(isPostCosmeticService(postFace)).toBe(true);
    expect(
      isPostCosmeticService({
        id: "other",
        name: "  Post-Cosmetic Lymphatic",
      })
    ).toBe(true);
  });
});

describe("groupServicesForPicker", () => {
  it("drops retired services so the $199 Customized Facial cannot reappear", () => {
    const groups = groupServicesForPicker([
      facial,
      svc({
        id: "svc-customized-facial",
        name: "Customized Facial",
        category: "Facials",
        price: 199,
        durationMin: 75,
        active: false,
      }),
    ]);
    expect(groups).toEqual([
      { heading: "Facials", items: [facial] },
    ]);
  });

  const groups = groupServicesForPicker([
    facial,
    lymphatic,
    postBody,
    consult,
    gel,
    postFace,
  ]);

  it("pulls the consult and post-op treatments into Post-Cosmetic Surgery", () => {
    const post = groups.find((g) => g.heading === POST_COSMETIC_HEADING);
    expect(post?.items.map((s) => s.id)).toEqual([
      FREE_CONSULTATION_ID,
      "svc-post-op-body",
      "svc-post-op-face",
    ]);
  });

  it("keeps remaining Body services under Body, after Post-Cosmetic", () => {
    const headings = groups.map((g) => g.heading);
    expect(headings).toEqual([
      "Facials",
      POST_COSMETIC_HEADING,
      "Body",
      "Nails",
    ]);
    const body = groups.find((g) => g.heading === "Body");
    expect(body?.items.map((s) => s.id)).toEqual(["svc-lymphatic"]);
  });

  it("does not change the DB category on the consult", () => {
    const post = groups.find((g) => g.heading === POST_COSMETIC_HEADING);
    expect(post?.items[0]?.category).toBe("Body");
    expect(consult.category).toBe("Body");
  });

  it("omits the Post-Cosmetic heading when nothing belongs there", () => {
    expect(
      groupServicesForPicker([facial, gel]).map((g) => g.heading)
    ).toEqual(["Facials", "Nails"]);
  });

  it("puts Free Consultation first even when it is the only item", () => {
    const only = groupServicesForPicker([consult]);
    expect(only).toEqual([
      { heading: POST_COSMETIC_HEADING, items: [consult] },
    ]);
  });
});

describe("filterServiceGroups", () => {
  const groups = groupServicesForPicker([
    facial,
    lymphatic,
    postBody,
    consult,
    gel,
    postFace,
  ]);

  it("returns the full grouped list when search is empty", () => {
    expect(filterServiceGroups(groups, "")).toEqual(groups);
    expect(filterServiceGroups(groups, "   ")).toEqual(groups);
  });

  it("surfaces Free Consultation for consult, free, or post", () => {
    for (const q of ["consult", "CONSULT", "free", "post"]) {
      const ids = filterServiceGroups(groups, q).flatMap((g) =>
        g.items.map((s) => s.id)
      );
      expect(ids).toContain(FREE_CONSULTATION_ID);
    }
  });

  it("keeps the whole Post-Cosmetic group when the heading matches", () => {
    const filtered = filterServiceGroups(groups, "post");
    expect(filtered.map((g) => g.heading)).toEqual([POST_COSMETIC_HEADING]);
    expect(filtered[0]?.items.map((s) => s.id)).toEqual([
      FREE_CONSULTATION_ID,
      "svc-post-op-body",
      "svc-post-op-face",
    ]);
  });

  it("filters by treatment name inside a group", () => {
    const filtered = filterServiceGroups(groups, "gel");
    expect(filtered).toEqual([{ heading: "Nails", items: [gel] }]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterServiceGroups(groups, "zzzz")).toEqual([]);
  });
});
