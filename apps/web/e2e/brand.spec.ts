import { brand } from "@nurlings/brand";
import { expect, type Page, test } from "@playwright/test";
import {
  captureScreenshot,
  completeOnboarding,
  createNamedBot,
  openNewBot,
  openUserSettings,
  signup,
} from "./helpers";

const UPSTREAM_NAME = /rakazo/i;

/** The page title, visible text and accessible labels of the current screen never name the upstream. */
async function expectNoUpstreamName(page: Page, screen: string) {
  const { title, text, labels } = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText,
    labels: [...document.querySelectorAll("[aria-label],[title],[placeholder],img[alt]")]
      .map((element) =>
        ["aria-label", "title", "placeholder", "alt"]
          .map((name) => element.getAttribute(name) ?? "")
          .join(" "),
      )
      .join(" "),
  }));
  expect(title, `${screen}: title`).not.toMatch(UPSTREAM_NAME);
  expect(text, `${screen}: visible text`).not.toMatch(UPSTREAM_NAME);
  expect(labels, `${screen}: labels and placeholders`).not.toMatch(UPSTREAM_NAME);
}

test("signed-out screens carry the brand and no upstream name", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText(brand.tagline).first()).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(brand.name));
  await expectNoUpstreamName(page, "welcome");
  await captureScreenshot(page, testInfo, "brand-welcome");

  await page.goto("/sign-in");
  await expect(page.getByText(brand.name).first()).toBeVisible();
  await expectNoUpstreamName(page, "sign in");

  await page.goto("/sign-up");
  await expectNoUpstreamName(page, "sign up");
});

test("the signed-in app and its settings carry the brand and no upstream name", async ({
  page,
}, testInfo) => {
  // The email's domain is shown in settings, so it must not name the upstream either.
  await signup(page, `brand-${Date.now()}@example.test`, "password12", "Brand Check");
  await expectNoUpstreamName(page, "onboarding");
  await completeOnboarding(page);
  await page.goto("/app");
  await page.waitForURL(/\/app\/[^/]+$/);
  await expectNoUpstreamName(page, "bot list and thread");

  await createNamedBot(page, "Scout");
  await openNewBot(page);
  await expect(page.getByTestId("side-panel")).toContainText(`New ${brand.bot.singular}`);
  await expectNoUpstreamName(page, "new bot panel");
  await captureScreenshot(page, testInfo, "brand-new-bot");

  for (const section of ["general", "models", "memory", "usage"] as const) {
    await page.goto("/app");
    await page.waitForURL(/\/app\/[^/]+$/);
    await openUserSettings(page, section);
    await expectNoUpstreamName(page, `settings ${section}`);
    if (section === "models") {
      await expect(page.getByTestId("user-settings")).toContainText(
        `${brand.name} does not pay for model usage`,
      );
      await captureScreenshot(page, testInfo, "brand-settings-models");
    }
  }
});
