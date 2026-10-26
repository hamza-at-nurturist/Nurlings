import { describe, expect, it } from "vitest";
import { cardMenu, parseCardMenuAction } from "./card-menu";

const labels = {
  moveTo: "Move to",
  approve: "Approve",
  open: "Open",
  statuses: {
    todo: "To do",
    doing: "In progress",
    review: "In review",
    blocked: "Blocked",
    done: "Done",
    closed: "Won't do",
  },
};

describe("cardMenu", () => {
  it("offers Move to with all six statuses, the current one checked, and Open", () => {
    const menu = cardMenu({ status: "doing", canApprove: false }, labels);
    expect(menu.map((entry) => entry.title)).toEqual(["Move to", "Open"]);
    expect(menu[0]?.subactions?.map((entry) => entry.title)).toEqual([
      "To do",
      "In progress",
      "In review",
      "Blocked",
      "Done",
      "Won't do",
    ]);
    expect(menu[0]?.subactions?.filter((entry) => entry.checked).map((entry) => entry.id)).toEqual([
      "move:doing",
    ]);
  });

  it("adds Approve between Move to and Open while In review", () => {
    const menu = cardMenu({ status: "review", canApprove: true }, labels);
    expect(menu.map((entry) => entry.id)).toEqual(["move", "approve", "open"]);
  });
});

describe("parseCardMenuAction", () => {
  it("reads every id the menu produces", () => {
    expect(parseCardMenuAction("move:blocked")).toEqual({ type: "move", status: "blocked" });
    expect(parseCardMenuAction("approve")).toEqual({ type: "approve" });
    expect(parseCardMenuAction("open")).toEqual({ type: "open" });
  });

  it("ignores anything else, including the submenu header and unknown statuses", () => {
    expect(parseCardMenuAction("move")).toBeNull();
    expect(parseCardMenuAction("move:later")).toBeNull();
    expect(parseCardMenuAction("")).toBeNull();
  });
});
