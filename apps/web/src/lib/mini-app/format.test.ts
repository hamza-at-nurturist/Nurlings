import { expect, it } from "vitest";
import { asText, formatValue, toNumber } from "./format";

it("reads numbers from numbers and numeric strings only", () => {
  expect(toNumber(5)).toBe(5);
  expect(toNumber("12.5")).toBe(12.5);
  expect(toNumber("")).toBeNull();
  expect(toNumber("abc")).toBeNull();
  expect(toNumber(Number.NaN)).toBeNull();
  expect(toNumber({})).toBeNull();
});

it("draws objects and arrays as nothing", () => {
  expect(asText("a")).toBe("a");
  expect(asText(3)).toBe("3");
  expect(asText({ $state: "/x" })).toBe("");
  expect(asText([1])).toBe("");
});

it("formats numbers, currency and percent points", () => {
  expect(formatValue(1876.884, "number", null, "en-US")).toBe("1,876.88");
  expect(formatValue(1876.884, "currency", null, "en-US")).toBe("$1,876.88");
  expect(formatValue(-91.45, "currency", "USD", "en-US")).toBe("-$91.45");
  expect(formatValue("12.55", "percent", null, "en-US")).toBe("12.6%");
  expect(formatValue(12.5, "percent", null, "en-US")).toBe("12.5%");
});

it("falls back to USD for a bad currency code and to text for non-numbers", () => {
  expect(formatValue(5, "currency", "dollars", "en-US")).toBe("$5.00");
  expect(formatValue("Jun 2027", "currency", null, "en-US")).toBe("Jun 2027");
  expect(formatValue("hello")).toBe("hello");
  expect(formatValue(7)).toBe("7");
});
