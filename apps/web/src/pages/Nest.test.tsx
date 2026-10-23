// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NestSnapshot } from "@rakazo/contracts";
import { NEST_MOODS } from "@rakazo/contracts";
import type * as UiWeb from "@rakazo/ui-web";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ nest: { snapshot: vi.fn() } }));
vi.mock("../lib/rpc", () => ({ rpc: api }));
vi.mock("./WindowChrome", () => ({ WindowChrome: () => null }));
vi.mock("../components/IconTooltip", () => ({
  IconTooltip: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../components/ai/primitives", () => ({
  LoadingState: () => <span role="status">loading</span>,
}));
vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => text + part + String(values[index] ?? ""), "");
  return { useLingui: () => ({ t }), Trans: ({ children }: { children: ReactNode }) => children };
});
vi.mock("@rakazo/ui-web", async (importOriginal) => {
  const original = await importOriginal<typeof UiWeb>();
  return {
    buttonVariants: original.buttonVariants,
    cn: original.cn,
    BotAvatar: ({ identity }: { identity: string }) => <i data-testid={`avatar-${identity}`} />,
  };
});

import { NEST_SECTIONS, NestPage } from "./Nest";

const nurling = (
  id: string,
  mood: NestSnapshot["nurlings"][number]["mood"],
  extra: Partial<NestSnapshot["nurlings"][number]> = {},
): NestSnapshot["nurlings"][number] => ({
  id,
  name: id.toUpperCase(),
  title: "",
  color: "#F97316::shape_1",
  mood,
  currentTask: null,
  nextRoutine: null,
  ...extra,
});

const snapshot = (parts: Partial<NestSnapshot> = {}): NestSnapshot => ({
  nurlings: [],
  needsYou: [],
  ...parts,
});

async function renderNest() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={["/app/nest"]}>
        <NestPage />
      </MemoryRouter>,
    ),
  );
  return {
    container,
    async cleanup() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.nest.snapshot.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("The Nest page", () => {
  it("shows a card per Nurling with its avatar, mood, current task and next routine", async () => {
    api.nest.snapshot.mockResolvedValue(
      snapshot({
        nurlings: [
          nurling("ada", "working", {
            title: "Researcher",
            currentTask: { runId: "r-1", status: "running", text: "Drafting the Q3 deck" },
            nextRoutine: { routineId: "rt-1", name: "Inbox", at: "2099-01-02T14:00:00.000Z" },
          }),
          nurling("bo", "sleeping"),
        ],
      }),
    );
    const { container, cleanup } = await renderNest();
    const cards = [...container.querySelectorAll("a[href^='/app/']")].filter(
      (link) => link.getAttribute("href") !== "/app",
    );
    expect(cards.map((card) => card.getAttribute("href"))).toEqual(["/app/ada", "/app/bo"]);
    expect(container.querySelector("[data-testid='avatar-ada']")).not.toBeNull();
    expect(container.textContent).toContain("Researcher");
    expect(container.textContent).toContain("Drafting the Q3 deck");
    expect(container.textContent).toMatch(/Next: Inbox · /);
    const moods = [...container.querySelectorAll("[role='img']")].map((el) =>
      el.getAttribute("aria-label"),
    );
    expect(moods).toEqual(["Working", "Sleeping"]);
    expect(container.textContent).not.toContain("Next: undefined");
    await cleanup();
  });

  it("renders nothing for the tray when nothing needs the user", async () => {
    api.nest.snapshot.mockResolvedValue(snapshot({ nurlings: [nurling("ada", "idle")] }));
    const { container, cleanup } = await renderNest();
    expect(container.textContent).not.toContain("Needs you");
    await cleanup();
  });

  it("lists pending asks and opens the right thread, group or bot", async () => {
    api.nest.snapshot.mockResolvedValue(
      snapshot({
        nurlings: [nurling("ada", "needs_you"), nurling("bo", "needs_you"), nurling("cy", "idle")],
        needsYou: [
          {
            botId: "ada",
            groupId: null,
            runId: "r-1",
            messageId: "m-1",
            kind: "approval",
            text: "Send the quote to Dana?",
            askedAt: "2026-03-10T12:00:00.000Z",
          },
          {
            botId: "bo",
            groupId: "group-9",
            runId: "r-2",
            messageId: null,
            kind: "takeover",
            text: null,
            askedAt: "2026-03-10T12:00:00.000Z",
          },
          {
            botId: "bo",
            groupId: null,
            runId: "r-3",
            messageId: "m-3",
            kind: "secret",
            text: null,
            askedAt: "2026-03-10T12:00:00.000Z",
          },
        ],
      }),
    );
    const { container, cleanup } = await renderNest();
    const tray = container.querySelector("section[aria-labelledby='nest-needs-you']");
    expect(tray?.textContent).toContain("Needs you");
    expect(tray?.textContent).toContain("Send the quote to Dana?");
    const hrefs = [...(tray?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/app/ada", "/app/g/group-9", "/app/bo"]);
    expect(tray?.querySelectorAll("button")).toHaveLength(0);
    await cleanup();
  });

  it("keeps rendering the known sections when the snapshot carries an unknown one", async () => {
    api.nest.snapshot.mockResolvedValue({
      ...snapshot({ nurlings: [nurling("ada", "idle")] }),
      someFutureSection: [{ anything: true }],
    });
    const { container, cleanup } = await renderNest();
    expect(container.textContent).toContain("ADA");
    await cleanup();
  });

  it("is a list of independent section components", () => {
    expect(NEST_SECTIONS.map((section) => section.name)).toEqual(["NeedsYouTray", "NurlingGrid"]);
  });

  it("shows an error that retrying cannot fix", async () => {
    api.nest.snapshot.mockRejectedValue(Object.assign(new Error("Not signed in"), { status: 401 }));
    const { container, cleanup } = await renderNest();
    expect(container.querySelector("[role='alert']")?.textContent).toBeTruthy();
    await cleanup();
  });
});

describe("The Nest eyes badge", () => {
  it("has an accessible name for every mood", async () => {
    api.nest.snapshot.mockResolvedValue(
      snapshot({ nurlings: NEST_MOODS.map((mood) => nurling(mood, mood)) }),
    );
    const { container, cleanup } = await renderNest();
    const badges = [...container.querySelectorAll("[role='img']")];
    expect(badges.map((el) => el.getAttribute("aria-label"))).toEqual([
      "Working",
      "Idle",
      "Sleeping",
      "Needs you",
      "Error",
    ]);
    expect(badges.map((el) => el.getAttribute("data-mood"))).toEqual([...NEST_MOODS]);
    for (const badge of badges) expect(badge.querySelectorAll("path")).toHaveLength(2);
    await cleanup();
  });

  it("turns every animation off under prefers-reduced-motion", () => {
    const css = readFileSync(
      join(import.meta.dirname, "../components/nest/eyes-badge.css"),
      "utf8",
    );
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.nest-eyes[^{]*\{[^}]*animation:\s*none/);
    expect(reduced).toContain(".nest-eyes .nest-eye");
  });
});
