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

test("a finance dashboard draws a chart, tones, badges and tabs", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1120, height: 900 });
  await page.goto("/e2e/fixtures/mini-app.html?app=finance");

  const app = page.getByTestId("mini-app");
  await expect(app.getByRole("heading", { name: "Finance overview" })).toBeVisible();
  await expect(app.getByRole("note")).toContainText("Assumption");
  await expect(app.getByText("$2,189.50", { exact: true })).toBeVisible();
  await expect(app.getByRole("progressbar", { name: "Runway used" })).toHaveAttribute(
    "aria-valuenow",
    "71",
  );
  await expect(app.getByRole("img", { name: /Closing cash by month/ })).toBeVisible();
  // One bar per month, and the months that end below zero are drawn in red.
  const bars = app.locator(".recharts-bar-rectangle path");
  await expect(bars).toHaveCount(12);
  await expect(bars.last()).toHaveAttribute("fill", "var(--destructive)");
  await expect(bars.first()).toHaveAttribute("fill", "var(--color-s0)");
  await expect(app.getByRole("table")).toHaveCount(0);

  await captureScreenshot(page, testInfo, "mini-app-finance-chart");

  await app.getByRole("tab", { name: "Table" }).click();
  await expect(app.getByRole("img", { name: /Closing cash by month/ })).toHaveCount(0);
  await expect(app.getByRole("table")).toBeVisible();
  await expect(app.getByText("Below zero").first()).toBeVisible();

  await captureScreenshot(page, testInfo, "mini-app-finance-table");

  await app.getByRole("tab", { name: "Breakdown" }).click();
  await expect(app.getByRole("table")).toHaveCount(0);
  await expect(app.getByRole("img", { name: /Where the spend goes/ })).toBeVisible();
  await expect(app.getByRole("img", { name: /Opening and closing cash/ })).toBeVisible();
  await expect(app.locator(".recharts-pie-sector")).toHaveCount(4);
  await expect(app.getByText("Rent", { exact: true })).toBeVisible();
  await expect(app.getByText("Software", { exact: true })).toBeVisible();
  // The legend follows the data's order, with each swatch the color of its slice.
  const legend = app.locator("ul li", { hasText: /^(Rent|Software|Food|Other)$/ });
  await expect(legend).toHaveText(["Rent", "Software", "Food", "Other"]);
  await expect(app.locator(".recharts-area")).toHaveCount(2);

  await captureScreenshot(page, testInfo, "mini-app-finance-breakdown");
});

for (const [theme, surface, appCard] of [
  ["dark", "rgb(0, 0, 0)", "#1f1f1f"],
  ["light", "rgb(255, 255, 255)", "#f2f2f2"],
] as const) {
  test(`a mini app is pure ${theme === "dark" ? "black" : "white"} in the ${theme} theme and the app around it keeps its own colors`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1120, height: 900 });
    await page.goto("/e2e/fixtures/mini-app.html?app=finance");
    // What the theme switch does: it sets data-theme on the document.
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);

    const app = page.getByTestId("mini-app");
    await expect(app.getByRole("heading", { name: "Finance overview" })).toBeVisible();
    await expect(app).toHaveCSS("background-color", surface);
    // Its cards sit on the same surface, with a border between them instead of a grey fill.
    await expect(app.locator("div.rounded-lg.border").first()).toHaveCSS(
      "background-color",
      surface,
    );

    // The variables are scoped to the mini app: the page beside it still has the app's own card color.
    const colors = await page.evaluate(() => {
      const read = (element: Element | null) =>
        element ? getComputedStyle(element).getPropertyValue("--card").trim() : "";
      return {
        inside: read(document.querySelector('[data-testid="mini-app"]')),
        outside: read(document.querySelector('[data-testid="asked"]')),
      };
    });
    expect(colors.outside.toLowerCase()).toBe(appCard);
    expect(colors.inside.toLowerCase()).toBe(theme === "dark" ? "#000000" : "#ffffff");

    // The chart code loads on demand; wait for it before taking the picture.
    await expect(app.locator(".recharts-bar-rectangle").first()).toBeVisible();

    await captureScreenshot(page, testInfo, `mini-app-finance-${theme}`);
  });
}
