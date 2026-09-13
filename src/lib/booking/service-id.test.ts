import { describe, expect, it } from "vitest";
import { serviceIdFromName } from "./service-id";

describe("serviceIdFromName", () => {
  it("slugs the name", () => {
    expect(serviceIdFromName("Bionexis Lite Pro", [])).toBe(
      "svc-bionexis-lite-pro"
    );
  });

  it("avoids ids already on the menu", () => {
    expect(
      serviceIdFromName("Bionexis Lite Pro", ["svc-bionexis-lite-pro"])
    ).toBe("svc-bionexis-lite-pro-2");
  });
});
