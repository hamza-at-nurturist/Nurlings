import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, openBotPanelTab, signup } from "./helpers";

test("the bot panel expands over the chat and collapses with Escape", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await signup(page, `bot-panel-expand-${Date.now()}@rakazo.test`, "password12", "Panel Sample");
  await completeOnboarding(page);
  await openBotPanelTab(page, "Advanced");

  const panel = page.getByTestId("side-panel");
  const sidebar = page.getByTestId("bots-sidebar");
  const transcript = page.getByTestId("transcript");
  const expand = page.getByRole("button", { name: "Expand panel", exact: true });
  const collapse = page.getByRole("button", { name: "Collapse panel", exact: true });
  const narrow = (await panel.boundingBox())!;

  await expand.click();
  await expect(collapse).toBeVisible();
  // Fails if the panel's test id changes, since the stylesheet selects on it.
  await expect
    .poll(async () => (await panel.boundingBox())!.width)
    .toBeGreaterThan(narrow.width + 200);
  const sidebarBox = (await sidebar.boundingBox())!;
  // The width grows before the edges settle, so wait for the final box rather than the first wider one.
  await expect
    .poll(async () => {
      const box = (await panel.boundingBox())!;
      return Math.max(
        Math.abs(box.x - (sidebarBox.x + sidebarBox.width)),
        Math.abs(box.x + box.width - 1400),
      );
    })
    .toBeLessThan(2);
  const wide = (await panel.boundingBox())!;
  const chat = (await transcript.boundingBox())!;
  expect(wide.x).toBeLessThanOrEqual(chat.x + 1);
  expect(wide.x + wide.width).toBeGreaterThanOrEqual(chat.x + chat.width - 1);
  await expect(sidebar).toBeVisible();
  await captureScreenshot(page, testInfo, "bot-panel-expanded");

  await page.keyboard.press("Escape");
  await expect(expand).toBeVisible();
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeCloseTo(narrow.width, 0);
  await expect(page.getByTestId("bot-settings")).toBeVisible();

  await expand.click();
  await collapse.click();
  await expect(expand).toBeVisible();

  await page.setViewportSize({ width: 700, height: 900 });
  await expect(expand).toBeHidden();
});
