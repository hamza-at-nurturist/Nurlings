import { describe, expect, it } from "vitest";
import { NEST_SLEEP_AFTER_MS, nestMood } from "./nest-mood.js";

const now = new Date("2026-03-10T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const base = { hasRunError: false, hasArmedRoutine: false, lastRunAt: null, now };

describe("nestMood", () => {
  it.each([
    ["queued", "working"],
    ["leased", "working"],
    ["running", "working"],
    ["waiting_input", "needs_you"],
    ["waiting_takeover", "needs_you"],
  ])("maps the active run status %s to %s", (status, mood) => {
    expect(nestMood({ ...base, status })).toBe(mood);
  });

  it("is error when the latest run failed", () => {
    expect(nestMood({ ...base, status: "idle", hasRunError: true })).toBe("error");
  });

  it("puts needs you before error and error before working", () => {
    expect(nestMood({ ...base, status: "waiting_input", hasRunError: true })).toBe("needs_you");
    expect(nestMood({ ...base, status: "running", hasRunError: true })).toBe("error");
  });

  it("keeps working even with an armed routine or an old last run", () => {
    expect(nestMood({ ...base, status: "running", hasArmedRoutine: true })).toBe("working");
  });

  it("is idle while a routine is armed, however long ago it last ran", () => {
    expect(nestMood({ ...base, status: "idle", hasArmedRoutine: true })).toBe("idle");
    expect(
      nestMood({ ...base, status: "idle", hasArmedRoutine: true, lastRunAt: ago(10 * 86_400_000) }),
    ).toBe("idle");
  });

  it("is idle with a run inside 24 hours and no routine", () => {
    expect(nestMood({ ...base, status: "idle", lastRunAt: ago(NEST_SLEEP_AFTER_MS - 1) })).toBe(
      "idle",
    );
  });

  it("is sleeping at exactly 24 hours and beyond, with no routine", () => {
    expect(nestMood({ ...base, status: "idle", lastRunAt: ago(NEST_SLEEP_AFTER_MS) })).toBe(
      "sleeping",
    );
    expect(nestMood({ ...base, status: "idle", lastRunAt: ago(NEST_SLEEP_AFTER_MS + 1) })).toBe(
      "sleeping",
    );
  });

  it("is sleeping for a Nurling that never ran and has nothing armed", () => {
    expect(nestMood({ ...base, status: "idle" })).toBe("sleeping");
  });

  it("treats a status it does not know as not active", () => {
    expect(nestMood({ ...base, status: "completed" })).toBe("sleeping");
  });
});
