import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BotAvatar } from "./bot-avatar.js";
import { BotAvatarStateNamesProvider } from "./bot-avatar-activity.js";

const html = (props: Partial<Parameters<typeof BotAvatar>[0]> = {}) =>
  renderToString(<BotAvatar color="#14B8A6" identity="maya" size={48} {...props} />);

describe("organic avatar states", () => {
  it.each([
    [undefined, "idle", undefined],
    ["running", "working", undefined],
    ["waiting_input", "needs", "rakazo-av-pip-warn"],
    ["waiting_takeover", "needs", "rakazo-av-pip-warn"],
    ["failed", "blocked", "rakazo-av-pip-bad"],
  ])("%s shows %s", (status, state, pip) => {
    const out = html({ status });
    expect(out).toContain(`data-state="${state}"`);
    if (pip) expect(out).toContain(pip);
    else expect(out).not.toContain("rakazo-av-pip");
  });

  it("shows in review and done from a ticket status, with the status-token pips", () => {
    expect(html({ ticketStatus: "review" })).toContain("rakazo-av-pip-hollow");
    const done = html({ ticketStatus: "done" });
    expect(done).toContain('data-state="done"');
    expect(done).toContain("rakazo-av-pip-good");
  });

  it("orbits by default and ripples while queued", () => {
    expect(html({ status: "running" })).toContain('data-look="orbit"');
    expect(html({ status: "queued" })).toContain('data-look="ripple"');
  });

  it("names the avatar with its state, and is decorative without a name", () => {
    const named = html({ status: "running", name: "Chief" });
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Chief, working"');
    expect(html({ status: "waiting_input", name: "Chief" })).toContain(
      'aria-label="Chief, needs you"',
    );
    expect(html()).toContain('aria-hidden="true"');
    expect(html()).not.toContain("aria-label");
  });

  it("uses translated state names when the app provides them", () => {
    const out = renderToString(
      <BotAvatarStateNamesProvider names={{ working: "au travail" }}>
        <BotAvatar color="#14B8A6" identity="maya" size={48} status="running" name="Chief" />
      </BotAvatarStateNamesProvider>,
    );
    expect(out).toContain('aria-label="Chief, au travail"');
  });

  it("draws the glint: catchlights and the stored gloss arc", () => {
    const out = html({ color: "#14B8A6::shape_9" });
    expect(out).toContain("rakazo-av-catch");
    expect(out).toContain("rakazo-av-gloss");
  });

  it("keeps a 24px avatar still: no props, orbit or motion layers, only the pip", () => {
    const out = html({ size: 24, status: "waiting_input" });
    expect(out).toContain('data-still="true"');
    expect(out).toContain("rakazo-av-pip-warn");
    expect(out).not.toContain("rakazo-av-orbit");
    expect(out).not.toContain("rakazo-av-dots");
    const working = html({ size: 24, status: "running" });
    expect(working).not.toContain("rakazo-av-orbit");
    expect(working).not.toContain("rakazo-av-slot");
    expect(html({ size: 25, status: "running" })).toContain("rakazo-av-orbit");
  });
  it("gives every body depth with its own clip id, and no jelly until a tap or tool swap", () => {
    const both = renderToString(
      <>
        <BotAvatar color="#14B8A6" identity="maya" size={48} />
        <BotAvatar color="#14B8A6" identity="other" size={48} />
      </>,
    );
    const ids = [...both.matchAll(/clip-path="url\(#([^)]+)\)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(both).toContain("rakazo-av-jelly");
    expect(both).toContain('stroke-opacity="0.3"');
    expect(both).not.toContain("data-jelly");
  });

  it("blushes on Done and Asleep only, and not at 24px or less", () => {
    expect(html({ ticketStatus: "done" })).toContain('class="rakazo-av-blush"');
    expect(html({ asleep: true })).toContain('class="rakazo-av-blush"');
    expect(html()).not.toContain('class="rakazo-av-blush"');
    expect(html({ status: "running" })).not.toContain('class="rakazo-av-blush"');
    expect(html({ ticketStatus: "done", size: 24 })).not.toContain('class="rakazo-av-blush"');
    expect(html({ ticketStatus: "done", size: 25 })).toContain('class="rakazo-av-blush"');
  });
});
