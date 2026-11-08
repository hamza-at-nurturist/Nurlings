import { BUILTIN_TOOL_NAMES } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import type { AvatarState } from "./avatar-life.js";
import {
  AVATAR_DONE_MS,
  AVATAR_LONG_RUN_MS,
  AVATAR_STATES,
  avatarBusySince,
  avatarFollowPull,
  avatarFollowRadius,
  avatarFollowStrength,
  avatarMotionState,
  avatarState,
  avatarSwapAdvance,
  avatarSwapStart,
  avatarSwapTo,
  avatarWorking,
} from "./avatar-life.js";
import { AVATAR_DIZZY_MS, createShakeDetector } from "./avatar-shake.js";
import { AVATAR_TOOL_CATEGORY, avatarToolCategory, avatarToolFromPayload } from "./avatar-tool.js";

describe("avatarState", () => {
  const cases: [string, Parameters<typeof avatarState>[0], AvatarState][] = [
    ["nothing", {}, "idle"],
    ["running", { runStatus: "running" }, "working"],
    ["queued", { runStatus: "queued" }, "working"],
    ["composing", { runStatus: "running", composing: true }, "thinking"],
    ["waiting for input", { runStatus: "waiting_input" }, "needs"],
    ["waiting for takeover", { runStatus: "waiting_takeover" }, "needs"],
    ["failed", { runStatus: "failed" }, "blocked"],
    ["blocked ticket", { ticketStatus: "blocked" }, "blocked"],
    ["review ticket", { ticketStatus: "review" }, "review"],
    ["done ticket", { ticketStatus: "done" }, "done"],
    ["closed ticket", { ticketStatus: "closed" }, "done"],
    ["just completed", { runStatus: "completed", completedAgoMs: 100 }, "done"],
    ["completed long ago", { runStatus: "completed", completedAgoMs: AVATAR_DONE_MS }, "idle"],
    ["completed, age unknown", { runStatus: "completed" }, "idle"],
    ["cancelled", { runStatus: "cancelled" }, "idle"],
    ["asleep wins", { runStatus: "running", asleep: true }, "asleep"],
    ["needs wins over working", { runStatus: "waiting_input", ticketStatus: "doing" }, "needs"],
    ["background run", { runStatus: "running", background: true }, "idle"],
    ["background failure", { runStatus: "failed", background: true }, "idle"],
    ["ticket review over running", { runStatus: "running", ticketStatus: "review" }, "review"],
  ];
  it.each(cases)("%s", (_name, input, expected) => {
    expect(avatarState(input)).toBe(expected);
  });

  it("only produces the eight states", () => {
    for (const [, input] of cases) expect(AVATAR_STATES).toContain(avatarState(input));
    expect(AVATAR_STATES).toHaveLength(8);
  });

  it("projects onto the older motion state", () => {
    expect(avatarMotionState("working")).toBe("working");
    expect(avatarMotionState("thinking")).toBe("thinking");
    expect(avatarMotionState("needs")).toBe("idle");
    expect(avatarMotionState("done")).toBe("idle");
  });
});

describe("avatarWorking", () => {
  it("defaults to the orbit dot", () => {
    expect(avatarWorking({ status: "running" })).toEqual({
      look: "orbit",
      tool: "none",
      long: false,
    });
  });
  it("shows the tool prop", () => {
    expect(avatarWorking({ status: "running", tool: "search" })).toMatchObject({
      look: "tool",
      tool: "search",
    });
  });
  it("shows the ring only for a known progress", () => {
    expect(avatarWorking({ status: "running", progress: 0 }).look).toBe("ring");
    expect(avatarWorking({ status: "running", progress: Number.NaN }).look).toBe("orbit");
    expect(avatarWorking({ status: "running", progress: null }).look).toBe("orbit");
  });
  it("a tool wins over progress", () => {
    expect(avatarWorking({ status: "running", tool: "write", progress: 0.5 }).look).toBe("tool");
  });
  it("ripples while queued or leased", () => {
    expect(avatarWorking({ status: "queued" }).look).toBe("ripple");
    expect(avatarWorking({ status: "leased", tool: "write" }).look).toBe("ripple");
    expect(avatarWorking({ status: "running" }).look).toBe("orbit");
  });
  it("is long at 3 minutes of continuous work", () => {
    expect(AVATAR_LONG_RUN_MS).toBe(180_000);
    expect(avatarWorking({ status: "running", busyMs: AVATAR_LONG_RUN_MS - 1 }).long).toBe(false);
    expect(avatarWorking({ status: "running", busyMs: AVATAR_LONG_RUN_MS }).long).toBe(true);
  });
});

describe("avatarBusySince", () => {
  it("starts, keeps and clears the busy clock", () => {
    let since = avatarBusySince(null, "working", 1000);
    expect(since).toBe(1000);
    since = avatarBusySince(since, "thinking", 5000);
    expect(since).toBe(1000);
    since = avatarBusySince(since, "working", 9000);
    expect(since).toBe(1000);
    since = avatarBusySince(since, "needs", 10_000);
    expect(since).toBeNull();
    expect(avatarBusySince(since, "working", 20_000)).toBe(20_000);
  });
});

describe("avatarFollowStrength", () => {
  it("follows the storyboard", () => {
    expect(avatarFollowStrength("idle")).toBe(1);
    expect(avatarFollowStrength("working")).toBe(1);
    expect(avatarFollowStrength("working", "computer")).toBe(0.3);
    expect(avatarFollowStrength("working", "write")).toBe(0);
    expect(avatarFollowStrength("working", "search")).toBe(0);
    expect(avatarFollowStrength("needs")).toBe(0.5);
    expect(avatarFollowStrength("blocked")).toBe(0.4);
    expect(avatarFollowStrength("thinking")).toBe(0);
    expect(avatarFollowStrength("asleep")).toBe(0);
  });
});

describe("tool swap", () => {
  it("goes out, in, rest", () => {
    let swap = avatarSwapStart("write");
    expect(avatarSwapTo(swap, "write")).toBe(swap);
    swap = avatarSwapTo(swap, "computer");
    expect(swap).toEqual({ shown: "write", target: "computer", phase: "out" });
    swap = avatarSwapAdvance(swap);
    expect(swap).toEqual({ shown: "computer", target: "computer", phase: "in" });
    swap = avatarSwapAdvance(swap);
    expect(swap).toEqual({ shown: "computer", target: "computer", phase: "rest" });
    expect(avatarSwapAdvance(swap)).toBe(swap);
  });
  it("replaces the pending target during a swap", () => {
    let swap = avatarSwapTo(avatarSwapStart("write"), "search");
    swap = avatarSwapTo(swap, "computer");
    expect(swap).toEqual({ shown: "write", target: "computer", phase: "out" });
    expect(avatarSwapAdvance(swap).shown).toBe("computer");
  });
  it("drops a prop that has just popped in when the tool changes again", () => {
    let swap = avatarSwapAdvance(avatarSwapTo(avatarSwapStart("write"), "search"));
    swap = avatarSwapTo(swap, "none");
    expect(swap).toEqual({ shown: "search", target: "none", phase: "out" });
  });
  it("swaps to and from none like any other tool", () => {
    const out = avatarSwapTo(avatarSwapStart("none"), "write");
    expect(out.phase).toBe("out");
    expect(avatarSwapTo(avatarSwapAdvance(avatarSwapAdvance(out)), "none").target).toBe("none");
  });
});

describe("avatar tool map", () => {
  it("maps built-in tools by category", () => {
    expect(avatarToolCategory("write_file")).toBe("write");
    expect(avatarToolCategory("ticket_comment")).toBe("write");
    expect(avatarToolCategory("web_search")).toBe("search");
    expect(avatarToolCategory("ticket_get")).toBe("search");
    expect(avatarToolCategory("browser_act")).toBe("computer");
    expect(avatarToolCategory("shell")).toBe("computer");
  });
  it("leaves everything else unmapped", () => {
    expect(avatarToolCategory("mcp__sheets__append_row")).toBeUndefined();
    expect(avatarToolCategory("message_user")).toBeUndefined();
    expect(avatarToolCategory("toString")).toBeUndefined();
    expect(avatarToolCategory(undefined)).toBeUndefined();
  });
  it("only maps registered built-in tools", () => {
    const registered = new Set<string>(BUILTIN_TOOL_NAMES);
    for (const name of Object.keys(AVATAR_TOOL_CATEGORY)) expect(registered.has(name)).toBe(true);
  });
  it("reads the category from a payload and treats anything else as none", () => {
    expect(avatarToolFromPayload({ name: "x", tool: "search" })).toBe("search");
    expect(avatarToolFromPayload({ name: "x" })).toBe("none");
    expect(avatarToolFromPayload({ tool: "sword" })).toBe("none");
  });
});

describe("shake detector", () => {
  const zigzag = (count: number, gap: number, step = 40) => {
    const detector = createShakeDetector();
    let fired = false;
    for (let i = 0; i < count; i += 1)
      fired = detector.push(i % 2 ? 100 : 100 + step, 50, i * gap) || fired;
    return fired;
  };
  it("fires on ten direction changes inside 1.5 s", () => {
    expect(zigzag(12, 100)).toBe(true);
  });
  it("does not fire on a quick six-turn wiggle", () => {
    expect(zigzag(8, 100)).toBe(false);
  });
  it("does not fire on slow movement", () => {
    expect(zigzag(12, 300)).toBe(false);
  });
  it("does not fire when each move is under 16px", () => {
    expect(zigzag(30, 20, 15)).toBe(false);
  });
  it("fires when each move is 16px", () => {
    expect(zigzag(12, 100, 16)).toBe(true);
  });
  it("does not fire on a straight sweep", () => {
    const detector = createShakeDetector();
    let fired = false;
    for (let i = 0; i < 30; i += 1) fired = detector.push(i * 30, i * 30, i * 16) || fired;
    expect(fired).toBe(false);
  });
  it("forgets turns after reset", () => {
    const detector = createShakeDetector();
    for (let i = 0; i < 11; i += 1) detector.push(i % 2 ? 100 : 140, 50, i * 100);
    detector.reset();
    expect(detector.push(100, 50, 1000)).toBe(false);
    expect(AVATAR_DIZZY_MS).toBe(2400);
  });
});

describe("avatar follow pull", () => {
  it("is 1 at the edge, 0 at and past the radius, and eases in between", () => {
    expect(avatarFollowPull(24, 48)).toBe(1);
    expect(avatarFollowPull(avatarFollowRadius(48), 48)).toBe(0);
    expect(avatarFollowPull(400, 48)).toBe(0);
    const samples = [30, 50, 70, 90, 110].map((d) => avatarFollowPull(d, 48));
    for (let i = 1; i < samples.length; i += 1) expect(samples[i]).toBeLessThan(samples[i - 1]!);
    expect(samples[0]).toBeLessThan(1);
    expect(samples.at(-1)).toBeGreaterThan(0);
  });
  it("uses 2.5 sizes with a 120px floor", () => {
    expect(avatarFollowRadius(32)).toBe(120);
    expect(avatarFollowRadius(96)).toBe(240);
  });
});
