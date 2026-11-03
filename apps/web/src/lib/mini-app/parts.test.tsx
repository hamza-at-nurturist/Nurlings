// @vitest-environment jsdom

import { catalogProblem } from "@rakazo/mini-app";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import {
  BreakdownBar,
  DiffView,
  filterRows,
  MessageView,
  MeterBar,
  Sparkline,
  toTone,
} from "./parts";

afterEach(() => {
  document.body.innerHTML = "";
});

async function draw(element: ReactElement) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  await act(async () => createRoot(container).render(element));
  return container;
}

const rows = [
  { name: "Marcus Webb", street: "12 Alder Way", buckets: ["all", "active"] },
  { name: "Leo Fontaine", street: "9 Elm Court", buckets: ["all", "optout"] },
  { name: "Grace Liu", street: "73 Harbor Ave", buckets: "review" },
];

it("filters table rows by a bucket and by typed text, and 'all' keeps every row", () => {
  expect(filterRows(rows, { key: "buckets", includes: "all" }, null)).toHaveLength(3);
  expect(filterRows(rows, { key: "buckets", includes: "optout" }, null).map((r) => r.name)).toEqual(
    ["Leo Fontaine"],
  );
  // A field that is a single value matches by equality.
  expect(filterRows(rows, { key: "buckets", includes: "review" }, null).map((r) => r.name)).toEqual(
    ["Grace Liu"],
  );
  const found = filterRows(rows, null, { value: "ELM", keys: ["name", "street"] });
  expect(found.map((r) => r.name)).toEqual(["Leo Fontaine"]);
  expect(
    filterRows(rows, { key: "buckets", includes: "active" }, { value: "elm", keys: ["street"] }),
  ).toEqual([]);
  expect(filterRows(rows, null, { value: "", keys: ["name"] })).toHaveLength(3);
});

it("reads a tone from data and treats anything else as neutral", () => {
  expect(toTone("warning")).toBe("warning");
  expect(toTone("loud")).toBe("neutral");
  expect(toTone({ $state: "/x" }, "info")).toBe("info");
});

it("accepts the new components and refuses what is outside the catalog", () => {
  const one = (type: string, props: unknown, on?: unknown) => ({
    elements: { a: { type, props, ...(on ? { on } : {}) } },
  });
  expect(catalogProblem(one("Icon", { name: "activity" }))).toBeNull();
  expect(catalogProblem(one("Icon", { name: "skull" }))).toMatch(/Icon/);
  expect(catalogProblem(one("Select", { value: "a", options: { $state: "/data/x" } }))).toBeNull();
  expect(catalogProblem(one("Badge", { text: "x", tone: { $item: "tone" } }))).toBeNull();
  expect(catalogProblem(one("Badge", { text: "x", tone: "loud" }))).toMatch(/Badge/);
  expect(catalogProblem(one("Message", { from: "robot", text: "hi" }))).toMatch(/Message/);
  expect(
    catalogProblem(one("Table", { columns: [{ key: "a", label: "A", format: "html" }], rows: [] })),
  ).toMatch(/Table/);
  expect(catalogProblem(one("Grid", { columns: 9 }))).toMatch(/Grid/);
  expect(catalogProblem(one("Grid", { columns: "sidebar" }))).toBeNull();
});

it("lets a button set interface state under /ui only", () => {
  const press = (statePath: string) => ({
    elements: {
      a: {
        type: "Button",
        props: { label: "Go" },
        on: { press: { action: "setState", params: { statePath, value: "leads" } } },
      },
    },
  });
  expect(catalogProblem(press("/ui/page"))).toBeNull();
  expect(catalogProblem(press("/data/leads"))).toMatch(/setState/);
  expect(catalogProblem(press("/ui"))).toMatch(/setState/);
});

it("draws a chat message with its decision card and thumb", async () => {
  const view = await draw(
    <MessageView
      from="agent"
      text="totally get it"
      meta="Sent 2:16"
      decision={{
        tags: [{ text: "CONTINUE", tone: "info" }],
        text: "Seller isn't ready yet.",
        footer: "Pre-send check at 2:14 PM",
        rating: "up",
      }}
    />,
  );
  expect(view.textContent).toContain("totally get it");
  expect(view.textContent).toContain("CONTINUE");
  expect(view.textContent).toContain("Pre-send check at 2:14 PM");
  expect(view.querySelector("svg.lucide-thumbs-up")).not.toBeNull();
});

it("draws a skipped message dashed and a note as a quiet line", async () => {
  const skipped = await draw(<MessageView from="contact" text="ok" meta="" skipped />);
  expect(skipped.querySelector(".border-dashed")).not.toBeNull();
  const note = await draw(<MessageView from="note" text="Today" meta="" />);
  expect(note.textContent).toBe("Today");
});

it("draws a diff with removed words struck out and added words highlighted", async () => {
  const view = await draw(
    <DiffView
      parts={[
        { text: "totally get it", kind: "same" },
        { text: ", no rush", kind: "del" },
        { text: ". roughly when", kind: "add" },
      ]}
    />,
  );
  expect(view.querySelector(".line-through")?.textContent).toBe(", no rush");
  expect(view.querySelector(".text-success")?.textContent).toBe(". roughly when");
});

it("sizes the outcome bar by share and lists each count", async () => {
  const view = await draw(
    <BreakdownBar
      segments={[
        { label: "Continue", value: 75, tone: "info" },
        { label: "DNC", value: 25, tone: "destructive" },
      ]}
    />,
  );
  const widths = [...view.querySelectorAll<HTMLElement>(".h-2 > span")].map((el) => el.style.width);
  expect(widths).toEqual(["75%", "25%"]);
  expect(view.textContent).toContain("Continue");
  expect(view.textContent).toContain("25");
});

it("draws a meter as n of max and a trend line only with two or more points", async () => {
  const meter = await draw(<MeterBar value={3} max={7} label="Known" />);
  const bar = meter.querySelector('[role="progressbar"]');
  expect(bar?.getAttribute("aria-valuenow")).toBe("3");
  expect(bar?.getAttribute("aria-valuemax")).toBe("7");
  expect(bar?.children).toHaveLength(7);
  const line = await draw(<Sparkline values={[1, 3, 2, 5]} />);
  expect(line.querySelector("polyline")).not.toBeNull();
  const none = await draw(<Sparkline values={[4]} />);
  expect(none.querySelector("svg")).toBeNull();
});
