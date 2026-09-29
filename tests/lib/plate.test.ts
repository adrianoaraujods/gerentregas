import { describe, expect, it } from "vitest";

import { formatPlate } from "@/lib/formatter";
import {
  normalizedPlateSchema,
  normalizePlate,
  plateSchema,
} from "@/lib/validators";

describe("normalizePlate", () => {
  it("uppercases and strips separators", () => {
    expect(normalizePlate("abc-1d23")).toBe("ABC1D23");
    expect(normalizePlate("abc-1234")).toBe("ABC1234");
  });

  it("strips spaces and non-alphanumeric characters", () => {
    expect(normalizePlate(" abc 1d23 ")).toBe("ABC1D23");
  });

  it("does not truncate overlong input", () => {
    expect(normalizePlate("ABC1D234EXTRA")).toBe("ABC1D234EXTRA");
  });
});

describe("formatPlate", () => {
  it("displays Mercosul plates with hyphen", () => {
    expect(formatPlate("ABC1D23")).toBe("ABC-1D23");
  });

  it("displays old-format plates with hyphen", () => {
    expect(formatPlate("ABC1234")).toBe("ABC-1234");
  });

  it("normalizes lowercase input before formatting", () => {
    expect(formatPlate("abc1d23")).toBe("ABC-1D23");
  });

  it("passes through partial values unformatted", () => {
    expect(formatPlate("AB")).toBe("AB");
    expect(formatPlate("")).toBe("");
  });

  it("does not mask invalid full-length values as valid", () => {
    expect(formatPlate("ABCDEFG")).toBe("ABCDEFG");
  });
});

describe("plateSchema", () => {
  it("accepts Mercosul plates and normalizes to uppercase without hyphen", () => {
    expect(plateSchema.parse("ABC-1D23")).toBe("ABC1D23");
    expect(plateSchema.parse("abc1d23")).toBe("ABC1D23");
  });

  it("accepts old-format plates and normalizes", () => {
    expect(plateSchema.parse("ABC-1234")).toBe("ABC1234");
    expect(plateSchema.parse("abc1234")).toBe("ABC1234");
  });

  it("rejects invalid plates", () => {
    expect(() => plateSchema.parse("AB12")).toThrow();
    expect(() => plateSchema.parse("ABCDEFG")).toThrow();
    expect(() => plateSchema.parse("1234567")).toThrow();
    expect(() => plateSchema.parse("")).toThrow();
    expect(() => plateSchema.parse("ABC1D234EXTRA")).toThrow();
  });

  it("rejects overlong but prefix-valid input", () => {
    expect(normalizedPlateSchema.safeParse("ABC1D234EXTRA").success).toBe(
      false,
    );
  });
});
