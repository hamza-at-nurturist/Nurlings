import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, createNamedBot, signup } from "./helpers";

test("board creates a ticket and opens it", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const stamp = Date.now();
  const title = "Ship the board";
  const description = "Track the kanban launch.";
  await signup(page, `board-${stamp}@rakazo.test`, "password12", "Board QA");
  await completeOnboarding(page);
  await createNamedBot(page, "Planner");
  await createNamedBot(page, "Scout");

  await page.getByTestId("user-menu-trigger").click();
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/board$/);
  await expect(page.getByTestId("board-columns")).toBeVisible();
  await expect(page.getByText("No tickets yet", { exact: true })).toBeVisible();
  const board = page.getByTestId("board-columns");
  expect(await board.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await expect(page.getByRole("heading", { name: "Won't do", exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 800, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    await board.evaluate(
      (node) => node.parentElement!.scrollWidth > node.parentElement!.clientWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await captureScreenshot(page, testInfo, "board-kanban");

  await page.getByRole("button", { name: "New ticket", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New ticket" });
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByLabel("Description").fill(description);
  const owner = dialog.getByLabel("Owner");
  await expect(owner.locator("option", { hasText: "Planner" })).toHaveCount(1);
  await owner.selectOption({ label: "Planner" });
  await dialog.getByRole("button", { name: "Create", exact: true }).click();

  await expect(dialog).toBeHidden();
  const card = page.locator("[data-testid^='board-card-']").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Planner");
  await captureScreenshot(page, testInfo, "board-ticket-created");

  await card.click();
  const detail = page.getByRole("dialog", { name: title });
  await expect(detail.getByLabel("Title")).toHaveValue(title);
  await expect(detail.getByLabel("Description")).toHaveValue(description);
  await expect(detail.getByTestId("ticket-owner")).toContainText("Planner");
  await expect(detail.getByTestId("ticket-status")).toContainText("To do");
  const activity = detail.getByTestId("ticket-activity");
  await expect(activity).toContainText("You created this and assigned it to Planner");

  await detail.getByTestId("ticket-status").click();
  await page.getByRole("menuitemradio", { name: "Blocked", exact: true }).click();
  await expect(detail.getByTestId("ticket-status")).toContainText("Blocked");
  await expect(activity).toContainText("You moved it to Blocked");

  await detail.getByLabel("Reply").fill("Any update on this?");
  await detail.getByRole("button", { name: "Send", exact: true }).click();
  await expect(activity).toContainText("Any update on this?");
  await expect(detail.getByLabel("Reply")).toHaveValue("");
  // A reply to a blocked ticket sends it back to work.
  await expect(detail.getByTestId("ticket-status")).toContainText("In progress");
  await expect(activity).toContainText("Moved back to In progress");
  await expect(activity.getByTestId("time-separator").first()).toBeVisible();
  await captureScreenshot(page, testInfo, "board-ticket-modal");

  // Full screen fills the window, and collapsing returns to the normal size.
  await detail.getByRole("button", { name: "Expand", exact: true }).click();
  await captureScreenshot(page, testInfo, "board-ticket-fullscreen");
  await detail.getByRole("button", { name: "Collapse", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Expand", exact: true })).toBeVisible();

  // Calling in another Nurling: the picker lists the space's Nurlings and the feed shows a chip.
  await detail.getByLabel("Reply").fill("@Sc");
  await detail.getByRole("option", { name: "Scout", exact: true }).click();
  await detail.getByLabel("Reply").pressSequentially("can you sanity-check this?");
  await detail.getByRole("button", { name: "Send", exact: true }).click();
  await expect(activity).toContainText("can you sanity-check this?");
  const chip = activity.getByTestId("mention-chip").filter({ hasText: "Scout" });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute("data-mention-color", /^#[0-9a-f]{3,6}$/i);
  await captureScreenshot(page, testInfo, "board-ticket-mention");

  // In review: one Approve action; a reply sends it back, approving moves it to Done.
  const status = detail.getByTestId("ticket-status");
  const approve = detail.getByRole("button", { name: "Approve", exact: true });
  await expect(approve).toHaveCount(0);
  await status.click();
  await page.getByRole("menuitemradio", { name: "In review", exact: true }).click();
  await expect(status).toContainText("In review");
  await expect(approve).toBeVisible();
  await detail.getByLabel("Reply").fill("Add last quarter too");
  await detail.getByRole("button", { name: "Send", exact: true }).click();
  await expect(status).toContainText("In progress");
  await expect(approve).toHaveCount(0);
  await status.click();
  await page.getByRole("menuitemradio", { name: "In review", exact: true }).click();
  await expect(approve).toBeVisible();
  await captureScreenshot(page, testInfo, "board-ticket-review");
  await approve.click();
  await expect(status).toContainText("Done");
  await expect(activity).toContainText("You approved it");
  await expect(approve).toHaveCount(0);
  await captureScreenshot(page, testInfo, "board-ticket-approved");

  // Attaching: the reply box's attach control stages a file, sending puts it on the comment and
  // in the ticket's files, labelled as yours.
  await detail.getByTestId("reply-file-input").setInputFiles({
    name: "listing-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Roof replaced in 2021."),
  });
  await expect(detail.getByTestId("reply-files")).toContainText("listing-notes.txt");
  await detail.getByLabel("Reply").fill("Notes from the viewing");
  await detail.getByRole("button", { name: "Send", exact: true }).click();
  await expect(detail.getByTestId("reply-files")).toHaveCount(0);
  await expect(activity).toContainText("Notes from the viewing");
  await expect(activity).toContainText("listing-notes.txt");
  await expect(activity).toContainText("TXT · 22 B");
  const files = detail.getByTestId("ticket-files");
  await expect(
    files.getByTestId("ticket-file").filter({ hasText: "listing-notes.txt" }),
  ).toContainText("You");
  // A file in Files leads its meta line with who added it; the comment's card keeps the short type.
  await expect(files.getByTestId("ticket-file")).toContainText("You · 22 B");
  await expect(activity).toContainText("You attached listing-notes.txt");
  await captureScreenshot(page, testInfo, "board-ticket-files");

  // Dates: one picker for start and due, shown short in the modal and on the card.
  await status.click();
  await page.getByRole("menuitemradio", { name: "In progress", exact: true }).click();
  await detail.getByTestId("ticket-start").click();
  await page.getByRole("button", { name: "Add time", exact: true }).click();
  await page.getByLabel("Time", { exact: true }).fill("09:30");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(detail.getByTestId("ticket-start")).toHaveText("Today 9:30 AM");
  await detail.getByTestId("ticket-due").click();
  await expect(page.getByRole("button", { name: "This weekend", exact: true })).toBeVisible();
  await captureScreenshot(page, testInfo, "board-ticket-dates");
  await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
  await expect(detail.getByTestId("ticket-due")).toHaveText("Tomorrow");
  await page.keyboard.press("Escape");
  await expect(detail).toBeHidden();
  await expect(card.getByTestId("card-dates")).toContainText("Today 9:30 AM –");
  await expect(card.getByTestId("card-dates")).toContainText("Tomorrow");
  await captureScreenshot(page, testInfo, "board-ticket-card-dates");
});
