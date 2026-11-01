import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, openBotPanelTab, signup, ui } from "./helpers";

test("bot settings open Avatar Studio on the Bot tab", async ({ page }, testInfo) => {
  const stamp = Date.now();
  await signup(page, `avatar-studio-${stamp}@rakazo.test`, "password12", "Avatar Studio");
  await completeOnboarding(page);
  await page.goto("/app");
  await page.waitForURL(/\/app\/[^/]+$/);

  await page.getByTestId("bot-settings-trigger").click();
  const settings = page.getByTestId("bot-settings");
  await expect(settings).toBeVisible();

  await settings.getByTestId("avatar-studio-trigger").click();
  const studio = page.getByTestId("avatar-studio");
  await expect(studio).toBeVisible();
  await expect(studio.getByText("Avatar Studio", { exact: true })).toBeVisible();
  await expect(studio.getByRole("tab", { name: ui("Bot"), exact: true })).toBeVisible();
  await expect(studio.getByRole("tab", { name: "Upload", exact: true })).toBeVisible();
  await expect(studio.getByTestId("avatar-studio-bot-tab")).toBeVisible();

  // The Rakazo icon set draws upstream's logo, so a Nurlings build offers only the original bodies
  // and no set switcher.
  await expect(studio.getByRole("tablist", { name: "Icon set" })).toHaveCount(0);
  const defaultLook = studio.getByTestId("avatar-studio-default");
  // The picker lists organic bodies only: the brand blob, then the three original bodies.
  await expect(studio.getByRole("button", { name: /^Shape \d+$/ })).toHaveCount(4);
  for (const retired of ["hex", "wedge", "squircle", "tablet", "pebble", "cloud", "teardrop"]) {
    await expect(studio.getByRole("button", { name: retired, exact: true })).toHaveCount(0);
  }
  const blob = studio.getByRole("button", { name: "Shape 1", exact: true });
  const drift = studio.getByRole("button", { name: "Shape 3", exact: true });
  // Sign-up gives Chief the brand blob, so the studio opens on it rather than on Default.
  await expect(blob).toHaveAttribute("aria-pressed", "true");
  await expect(defaultLook).toHaveAttribute("aria-pressed", "false");
  await expect(drift).toHaveAttribute("aria-pressed", "false");

  await drift.click();
  await expect(drift).toHaveAttribute("aria-pressed", "true");
  await expect(blob).toHaveAttribute("aria-pressed", "false");
  await expect(defaultLook).toHaveAttribute("aria-pressed", "false");

  await defaultLook.click();
  await expect(defaultLook).toHaveAttribute("aria-pressed", "true");
  await expect(drift).toHaveAttribute("aria-pressed", "false");
  await expect(studio.locator(".rakazo-organic-avatar-eyes").first()).toBeVisible();

  await studio.getByRole("button", { name: "Color #EAB308" }).click();
  await expect(defaultLook).toHaveAttribute("aria-pressed", "true");
  await expect(drift).toHaveAttribute("aria-pressed", "false");

  await drift.click();
  await studio.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(defaultLook).toHaveAttribute("aria-pressed", "true");
  await expect(drift).toHaveAttribute("aria-pressed", "false");

  await captureScreenshot(page, testInfo, "avatar-studio-bot-tab");
  await studio.getByRole("button", { name: "Done", exact: true }).click();
});
