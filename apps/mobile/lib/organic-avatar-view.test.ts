import type { AvatarWorking } from "@rakazo/core";
import { describe, expect, it } from "vitest";
import { dullBody, lidCap, organicAvatarView, TOOL_GAZE } from "./organic-avatar-view";

const orbit: AvatarWorking = { look: "orbit", tool: "none", long: false };
const base = {
  working: orbit,
  shownTool: "none" as const,
  clock: "running" as const,
  size: 54,
  reducedMotion: false,
};

describe("organicAvatarView", () => {
  it("gives each pip state its pip and the rest none", () => {
    expect(organicAvatarView({ ...base, state: "needs" }).pip).toBe("needs");
    expect(organicAvatarView({ ...base, state: "review" }).pip).toBe("review");
    expect(organicAvatarView({ ...base, state: "blocked" }).pip).toBe("blocked");
    expect(organicAvatarView({ ...base, state: "done" }).pip).toBe("done");
    for (const state of ["idle", "thinking", "working", "asleep"] as const)
      expect(organicAvatarView({ ...base, state }).pip).toBeUndefined();
  });
  it("shows the working look only while working and moving", () => {
    expect(organicAvatarView({ ...base, state: "working" }).look).toBe("orbit");
    expect(organicAvatarView({ ...base, state: "needs" }).look).toBeUndefined();
    expect(organicAvatarView({ ...base, state: "working", clock: "still" }).look).toBeUndefined();
  });
  it("shows the prop on screen while a tool is shown, even if the tool just changed", () => {
    const view = organicAvatarView({
      ...base,
      state: "working",
      working: { look: "tool", tool: "search", long: false },
      shownTool: "write",
    });
    expect(view).toMatchObject({ look: "tool", tool: "write" });
  });
  it("falls back to the orbit when the tool is dropped mid-swap", () => {
    const view = organicAvatarView({
      ...base,
      state: "working",
      working: { look: "tool", tool: "none", long: false },
    });
    expect(view.look).toBe("orbit");
  });
  it("keeps 24 pt, Reduce Motion and a stopped clock still, keeping the pip", () => {
    for (const still of [{ size: 24 }, { reducedMotion: true }, { clock: "parked" as const }]) {
      const view = organicAvatarView({ ...base, ...still, state: "blocked" });
      expect(view).toMatchObject({ animated: false, pip: "blocked" });
      expect(organicAvatarView({ ...base, ...still, state: "working" }).look).toBeUndefined();
    }
  });
  it("marks the long run only for a moving working or thinking avatar", () => {
    const long = { ...orbit, long: true };
    expect(organicAvatarView({ ...base, state: "working", working: long }).long).toBe(true);
    expect(organicAvatarView({ ...base, state: "thinking", working: long }).long).toBe(true);
    expect(organicAvatarView({ ...base, state: "idle", working: long }).long).toBe(false);
    expect(organicAvatarView({ ...base, state: "working", working: long, size: 20 }).long).toBe(
      false,
    );
  });
});

describe("dullBody", () => {
  it("moves a hex color toward the dull gray", () => {
    expect(dullBody("#000000", "#646464", 0.5)).toBe("#323232");
    expect(dullBody("#fff", "#000000", 0.5)).toBe("#808080");
  });
  it("leaves colors it cannot parse alone", () => {
    expect(dullBody("rgb(1,2,3)", "#7a7a80")).toBe("rgb(1,2,3)");
  });
});

describe("eye settings", () => {
  it("holds the lids lower for asleep, blocked and long-run avatars", () => {
    expect(lidCap({ asleep: true, dull: false, long: false })).toBeLessThan(0.2);
    expect(lidCap({ asleep: false, dull: true, long: false })).toBe(0.75);
    expect(lidCap({ asleep: false, dull: false, long: true })).toBe(0.8);
    expect(lidCap({ asleep: false, dull: false, long: false })).toBe(1);
  });
  it("rests the gaze on each prop and centres it without one", () => {
    expect(TOOL_GAZE.none).toEqual({ x: 0, y: 0 });
    expect(TOOL_GAZE.write.y).toBeGreaterThan(0);
    expect(TOOL_GAZE.search.y).toBeLessThan(0);
  });
});
