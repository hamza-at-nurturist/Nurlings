import { brand } from "@nurlings/brand";
import { describe, expect, it } from "vitest";
import { DOCS_URL, mobileAppUrl } from "./brand-links";

const stores = { iosApp: "https://apps.example.test/ios", androidApp: "https://dl.example.test/a" };

describe("mobileAppUrl", () => {
  it("offers nothing while no store listing is configured", () => {
    expect(mobileAppUrl("Android")).toBeNull();
    expect(mobileAppUrl("iPhone")).toBeNull();
  });

  it("offers the Android download on Android and the App Store everywhere else", () => {
    expect(mobileAppUrl("Mozilla/5.0 (Linux; Android 15)", stores)).toBe(stores.androidApp);
    expect(mobileAppUrl("Mozilla/5.0 (iPhone)", stores)).toBe(stores.iosApp);
    expect(mobileAppUrl("Mozilla/5.0 (Macintosh)", stores)).toBe(stores.iosApp);
  });

  it("offers nothing for a platform whose listing is missing", () => {
    expect(mobileAppUrl("Android", { ...stores, androidApp: null })).toBeNull();
    expect(mobileAppUrl("iPhone", { ...stores, iosApp: null })).toBeNull();
  });
});

it("points documentation at the product site", () => {
  expect(DOCS_URL).toBe(brand.urls.site);
  expect(DOCS_URL).not.toMatch(/rakazo|elie222/i);
});
