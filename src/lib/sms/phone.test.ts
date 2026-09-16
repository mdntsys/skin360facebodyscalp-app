import { describe, expect, it } from "vitest";
import { toE164 } from "./phone";

describe("toE164", () => {
  it("accepts US local and +1 numbers", () => {
    expect(toE164("(661) 812-6999")).toBe("+16618126999");
    expect(toE164("6618126999")).toBe("+16618126999");
    expect(toE164("+1 661-888-4698")).toBe("+16618884698");
  });

  it("rejects junk", () => {
    expect(toE164("")).toBeNull();
    expect(toE164("123")).toBeNull();
    expect(toE164(null)).toBeNull();
  });
});
