import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, signup } from "./helpers";

test("a ticket opens as a two-tab sheet on a phone", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const stamp = Date.now();
  const title = "Comp report for 4521 Elmwood Ave, Kansas City MO 64130";
  const reply = "Use the county records if Redfin blocks you.";
  await signup(page, `ticket-mobile-${stamp}@rakazo.test`, "password12", "Phone QA");
  await completeOnboarding(page);
  await page.getByTestId("user-menu-trigger").click();
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/board$/);
  const quickAdd = page.getByRole("textbox", { name: "Tell a Nurling what to do…" });
  await quickAdd.fill(title);
  await quickAdd.press("Shift+Enter");
  await quickAdd.pressSequentially(
    "Find 3 to 5 recent sold comps: 3 bed single-family, within 1 mile, sold in the last 6 months. Give a price range and a rough ARV in a short file. If you can't find solid data, ask me before guessing.",
  );
  await quickAdd.press("Enter");
  const card = page.locator("[data-testid^='board-card-']").filter({ hasText: title });
  await expect(card).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await card.getByTestId("card-open").click();
  const sheet = page.getByRole("dialog", { name: title });
  await expect(sheet.getByTestId("ticket-sheet")).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box).toMatchObject({ x: 0, y: 0, width: 390 });
  await expect(sheet.getByRole("tab", { name: "Ticket" })).toHaveAttribute("aria-selected", "true");
  await expect(sheet.getByTestId("ticket-sheet")).toContainText(/Board\s*\/\s*NUR-\d+/);
  await expect(sheet.getByRole("button", { name: "Expand" })).toHaveCount(0);
  for (const id of ["ticket-back", "ticket-status", "ticket-owner", "ticket-due", "ticket-start"]) {
    const control = await sheet.getByTestId(id).boundingBox();
    expect(control!.height).toBeGreaterThanOrEqual(44);
  }

  // Activity: the title moves into the header, and a reply lands at the bottom of the feed.
  await sheet.getByRole("tab", { name: /^Activity/ }).click();
  await expect(sheet.getByTestId("ticket-sheet-title")).toHaveText(title);
  const replyBox = sheet.getByLabel("Reply");
  expect(await replyBox.evaluate((node) => getComputedStyle(node).fontSize)).toBe("16px");
  await replyBox.fill(reply);
  await sheet.getByRole("button", { name: "Send", exact: true }).click();
  await expect(sheet.getByTestId("ticket-activity")).toContainText(reply);
  await expect(replyBox).toHaveValue("");
  await captureScreenshot(page, testInfo, "ticket-phone-activity");

  // A swipe right goes back to the ticket, where the reply is the latest activity.
  await sheet.getByTestId("activity-tab").evaluate((node) => {
    const at = (x: number) => new Touch({ identifier: 1, target: node, clientX: x, clientY: 300 });
    node.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [at(60)] }));
    node.dispatchEvent(
      new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [at(300)] }),
    );
  });
  await expect(sheet.getByRole("tab", { name: "Ticket" })).toHaveAttribute("aria-selected", "true");
  await expect(sheet.getByTestId("ticket-latest-activity")).toContainText(`You: ${reply}`);

  // In review pins Approve at the bottom.
  await sheet.getByTestId("ticket-status").click();
  await page.getByRole("menuitemradio", { name: "In review", exact: true }).click();
  await expect(sheet.getByTestId("ticket-status")).toContainText("In review");
  await expect(page.getByRole("menu")).toHaveCount(0);
  const approve = sheet.getByTestId("ticket-approve");
  await expect(approve).toBeVisible();
  const approveBox = await approve.boundingBox();
  expect(approveBox!.y + approveBox!.height).toBeGreaterThan(844 - 80);
  await captureScreenshot(page, testInfo, "ticket-phone-ticket");

  await sheet.getByTestId("ticket-back").click();
  await expect(sheet).toBeHidden();
});
