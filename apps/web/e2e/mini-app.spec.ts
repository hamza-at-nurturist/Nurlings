import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

test("a mini app draws a lead pipeline and a button hands its draft to the bot", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1120, height: 760 });
  await page.goto("/e2e/fixtures/mini-app.html");

  const app = page.getByTestId("mini-app");
  await expect(app.getByRole("heading", { name: "Lead pipeline" })).toBeVisible();
  await expect(app.getByText("Open leads")).toBeVisible();
  await expect(app.getByText("14 Cedar Lane")).toBeVisible();
  await expect(app.getByText("902 Oak Street")).toBeVisible();
  await expect(app.getByText("31 Birch Court")).toBeVisible();

  // Each lead sits in its own stage column.
  const column = (title: string) =>
    app.locator("div.rounded-lg.border", { has: page.getByText(title, { exact: true }) }).first();
  await expect(column("New").getByText("14 Cedar Lane")).toBeVisible();
  await expect(column("New").getByText("902 Oak Street")).toHaveCount(0);
  await expect(column("Contacted").getByText("902 Oak Street")).toBeVisible();

  await captureScreenshot(page, testInfo, "mini-app-lead-pipeline");

  await app.getByRole("button", { name: "Draft a text" }).first().click();
  await expect(page.getByTestId("asked")).toContainText("14 Cedar Lane");
});
