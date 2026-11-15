import { generateMessageId } from "@lingui/message-utils/generateMessageId";
import { brand } from "@nurlings/brand";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({ getLocales: vi.fn(() => [{ languageTag: "en-US" }]) }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("./ui-direction", () => ({ applyMobileUiDirection: vi.fn() }));

/** Looks a message up the way the compiled macro does, in the freshly imported catalogs. */
async function translator() {
  const { i18n } = await import("@lingui/core");
  return (message: string) => i18n._({ id: generateMessageId(message), message });
}

describe("mobile catalog rebranding", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("shows the configured product and bot names from the upstream catalogs", async () => {
    const { activateUiLocale } = await import("./i18n");
    activateUiLocale("en");
    const t = await translator();
    expect(brand.name).toBe("Nurlings");
    expect(t("Sign in to Rakazo")).toBe(`Sign in to ${brand.name}`);
    expect(t("Create bot")).toBe("Create Nurling");
  });

  it("keeps rebranding in a translated locale", async () => {
    const { activateUiLocale } = await import("./i18n");
    activateUiLocale("de");
    const t = await translator();
    expect(t("Sign in to Rakazo")).toContain(brand.name);
    expect(t("Sign in to Rakazo")).not.toContain("Rakazo");
  });
});
