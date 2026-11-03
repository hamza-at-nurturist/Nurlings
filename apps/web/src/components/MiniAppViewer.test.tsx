// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { financeApp, financeData } from "../lib/mini-app/finance-example";
import { leadPipelineApp, leadPipelineData } from "../lib/mini-app/lead-pipeline-example";
import { outreachApp, outreachData } from "../lib/mini-app/outreach-example";
import { MiniAppViewer, parseMiniApp } from "./MiniAppViewer";

vi.mock("@lingui/react/macro", () => ({
  useLingui: () => ({ t: (strings: TemplateStringsArray) => strings.join("") }),
}));

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

async function render(props: Parameters<typeof MiniAppViewer>[0]) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<MiniAppViewer {...props} />);
  });
  return container;
}

it("draws the lead pipeline with each lead in its stage and live numbers", async () => {
  const loadData = vi.fn(async () => leadPipelineData);
  const view = await render({ source: leadPipelineApp, loadData });
  expect(loadData).toHaveBeenCalledWith("leads.json");
  expect(view.textContent).toContain("Lead pipeline");
  expect(view.textContent).toContain("Open leads");
  const columns = [...view.querySelectorAll('[data-slot="card"], .rounded-lg.border')].filter(
    (el) => el.querySelector(":scope > div.text-sm.font-medium"),
  );
  const byTitle = Object.fromEntries(
    columns.map((el) => [el.querySelector(":scope > div.text-sm.font-medium")?.textContent, el]),
  );
  expect(byTitle.New?.textContent).toContain("14 Cedar Lane");
  expect(byTitle.New?.textContent).not.toContain("902 Oak Street");
  expect(byTitle.Contacted?.textContent).toContain("902 Oak Street");
  expect(byTitle["Offer out"]?.textContent).toContain("31 Birch Court");
});

it("hands a button's message to the bot without sending anything", async () => {
  const onAskBot = vi.fn();
  const view = await render({
    source: leadPipelineApp,
    loadData: async () => leadPipelineData,
    onAskBot,
  });
  const button = [...view.querySelectorAll("button")].find(
    (el) => el.textContent === "Draft a text",
  );
  await act(async () => button?.click());
  expect(onAskBot).toHaveBeenCalledTimes(1);
  expect(onAskBot.mock.calls[0]?.[0]).toBe(leadPipelineData.leads[0]?.draft);
});

it("sends nothing when a button's message points at data that is not there", async () => {
  const onAskBot = vi.fn();
  const view = await render({
    source: leadPipelineApp,
    loadData: async () => ({
      ...leadPipelineData,
      leads: [{ ...leadPipelineData.leads[0], draft: undefined }],
    }),
    onAskBot,
  });
  const button = [...view.querySelectorAll("button")].find(
    (el) => el.textContent === "Draft a text",
  );
  await act(async () => button?.click());
  expect(onAskBot).not.toHaveBeenCalled();
});

it("reads the data again every ten seconds", async () => {
  vi.useFakeTimers();
  let open = 3;
  const loadData = vi.fn(async () => ({
    ...leadPipelineData,
    summary: { open, due: 1 },
  }));
  const view = await render({ source: leadPipelineApp, loadData });
  expect(view.textContent).toContain("3");
  open = 7;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(loadData.mock.calls.length).toBeGreaterThanOrEqual(2);
  expect(view.textContent).toContain("7");
});

it("draws with empty data when a data file is missing", async () => {
  const view = await render({ source: leadPipelineApp, loadData: async () => null });
  expect(view.textContent).toContain("Lead pipeline");
  expect(view.querySelector('[role="alert"]')).toBeNull();
});

it("draws data from outside tools as plain text, never as markup", async () => {
  const view = await render({
    source: leadPipelineApp,
    loadData: async () => ({
      ...leadPipelineData,
      leads: [{ ...leadPipelineData.leads[0], address: "<img src=x onerror=alert(1)>" }],
    }),
  });
  expect(view.querySelector("img")).toBeNull();
  expect(view.textContent).toContain("<img src=x onerror=alert(1)>");
});

it("refuses files it cannot draw, and draws nothing from them", () => {
  const spec = (type: string) =>
    JSON.stringify({
      data: [],
      spec: { root: "a", elements: { a: { type, props: {}, children: [] } } },
    });
  expect(parseMiniApp("{nope")).toEqual({ error: "json" });
  expect(parseMiniApp(JSON.stringify({ data: [] }))).toEqual({ error: "shape" });
  expect(parseMiniApp(spec("Iframe"))).toEqual({ error: "unsupported" });
  expect(parseMiniApp(spec("Heading"))).toEqual({ error: "unsupported" });
  const withProps = (type: string, props: unknown, on?: unknown) =>
    JSON.stringify({
      data: [],
      spec: { root: "a", elements: { a: { type, props, children: [], ...(on ? { on } : {}) } } },
    });
  expect(parseMiniApp(withProps("Heading", { text: "Hi" }))).not.toHaveProperty("error");
  expect(parseMiniApp(withProps("Heading", { text: { evil: [1] } }))).not.toHaveProperty("error");
  expect(parseMiniApp(withProps("Stat", { label: "x" }))).toEqual({ error: "unsupported" });
  expect(parseMiniApp(withProps("Table", { columns: "no", rows: [] }))).toEqual({
    error: "unsupported",
  });
  const press = (action: string, params: unknown) => ({ press: { action, params } });
  expect(
    parseMiniApp(withProps("Button", { label: "Go" }, press("askBot", { message: "hi" }))),
  ).not.toHaveProperty("error");
  expect(parseMiniApp(withProps("Button", { label: "Go" }, press("deleteEverything", {})))).toEqual(
    { error: "unsupported" },
  );
  expect(parseMiniApp(withProps("Button", { label: "Go" }, press("askBot", {})))).toEqual({
    error: "unsupported",
  });
  expect(parseMiniApp("x".repeat(200_001))).toEqual({ error: "large" });
  const incomplete = JSON.stringify({ data: [], spec: { root: "missing", elements: {} } });
  expect(parseMiniApp(incomplete)).toMatchObject({ error: expect.any(String) });
  expect("error" in parseMiniApp(leadPipelineApp)).toBe(false);
});

it("accepts the example that the Apps skill teaches bots", () => {
  const skill = readFileSync(
    path.join(import.meta.dirname, "../../../../packages/adapters/src/nurlings-skills.ts"),
    "utf8",
  );
  const example = /\\`\\`\\`json\n([\s\S]*?)\\`\\`\\`/.exec(skill)?.[1];
  expect(example).toBeDefined();
  expect("error" in parseMiniApp(example ?? "")).toBe(false);
});

it("draws the finance dashboard: formatted stats, a chart, a callout and a progress bar", async () => {
  const view = await render({ source: financeApp, loadData: async () => financeData });
  expect(view.textContent).toContain("$2,189.50");
  expect(view.textContent).toContain("$410.50");
  expect(view.textContent).toContain("Jun 2027");
  expect(view.textContent).toContain("At the current spend");
  expect(view.querySelector('[role="note"]')?.textContent).toContain("Assumption");
  const progress = view.querySelector('[role="progressbar"]');
  expect(progress?.getAttribute("aria-valuenow")).toBe("71");
  const chart = view.querySelector('figure[role="img"]');
  expect(chart?.getAttribute("aria-label")).toContain("Closing cash by month");
  expect(chart?.getAttribute("aria-label")).toContain("Nov 2026 $2,189.50 to Oct 2027 -$2,326.00");
  // The chart library loads on demand; once it has, it draws inside the figure.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  expect(chart?.querySelector(".recharts-wrapper")).not.toBeNull();
  expect(view.textContent).toContain("Spend per month");
  // An expression inside a list item resolves like any other prop.
  const facts = [...view.querySelectorAll("dd")].map((el) => el.textContent);
  expect(facts).toContain("$410.50");
});

it("switches tabs: the chart shows first, then the table with badge cells", async () => {
  const view = await render({ source: financeApp, loadData: async () => financeData });
  expect(view.querySelector("table")).toBeNull();
  const tab = [...view.querySelectorAll('[role="tab"]')].find((el) => el.textContent === "Table");
  await act(async () => (tab as HTMLElement | undefined)?.click());
  expect(view.querySelector('figure[role="img"]')).toBeNull();
  const cells = [...view.querySelectorAll("td")].map((el) => el.textContent);
  expect(cells).toContain("OK");
  expect(cells).toContain("Below zero");
  expect(view.querySelector("td span.text-destructive")?.textContent).toMatch(/^-\$/);
});

it("refuses new components used wrongly", () => {
  const one = (type: string, props: unknown) =>
    JSON.stringify({
      data: [],
      spec: { root: "a", elements: { a: { type, props, children: [] } } },
    });
  expect(parseMiniApp(one("Chart", { type: "donut", data: [], x: "a", y: "b" }))).toEqual({
    error: "unsupported",
  });
  expect(parseMiniApp(one("Chart", { type: "pie", data: [], x: "a", y: "b" }))).not.toHaveProperty(
    "error",
  );
  expect(
    parseMiniApp(one("Chart", { type: "line", data: [], x: "a", y: ["b", "c"] })),
  ).not.toHaveProperty("error");
  expect(parseMiniApp(one("Chart", { type: "line", data: [], x: "a", y: [] }))).toEqual({
    error: "unsupported",
  });
  expect(
    parseMiniApp(one("Chart", { type: "line", data: [], x: "a", y: ["a", "b", "c", "d", "e"] })),
  ).toEqual({ error: "unsupported" });
  expect(parseMiniApp(one("Progress", { value: 5 }))).toEqual({ error: "unsupported" });
  expect(parseMiniApp(one("Callout", { text: "hi", tone: "loud" }))).toEqual({
    error: "unsupported",
  });
  expect(
    parseMiniApp(one("Table", { columns: [{ key: "a", label: "A", format: "html" }], rows: [] })),
  ).toEqual({ error: "unsupported" });
  expect(parseMiniApp(one("Tabs", { tabs: [], value: "a" }))).toEqual({ error: "unsupported" });
  expect(parseMiniApp(one("KeyValue", { items: [{ label: "a", value: "b" }] }))).not.toHaveProperty(
    "error",
  );
});

it("the outreach dashboard passes the strict validator and uses the full catalog", () => {
  const parsed = parseMiniApp(outreachApp);
  expect(parsed).not.toHaveProperty("error");
  if ("error" in parsed) return;
  expect(parsed.layout).toBe("full");
  const types = new Set(Object.values(parsed.spec.elements).map((element) => element.type));
  for (const type of ["Grid", "Tabs", "Table", "Message", "Diff", "Breakdown", "Meter", "Select"]) {
    expect(types.has(type)).toBe(true);
  }
});

it("the outreach dashboard switches pages from the sidebar and filters its leads", async () => {
  const view = await render({ source: outreachApp, loadData: async () => outreachData });
  const text = () => view.textContent ?? "";
  const press = async (label: string, within: ParentNode = view) => {
    const button = [...within.querySelectorAll("button")].find((el) =>
      el.textContent?.trim().startsWith(label),
    );
    await act(async () => button?.click());
  };

  // It opens on Today, with the needs-attention list.
  expect(text()).toContain("Needs attention");
  expect(text()).toContain("Marcus Webb · Alder Way");
  expect(text()).not.toContain("Showing 1–8 of 248");

  await press("Leads");
  expect(text()).toContain("Showing 1–8 of 248");
  expect(text()).toContain("12 Alder Way");

  // A tab keeps only the leads in its bucket.
  const tab = [...view.querySelectorAll('[role="tab"]')].find((el) =>
    el.textContent?.startsWith("Opted out"),
  );
  await act(async () => (tab as HTMLElement | undefined)?.click());
  expect(text()).toContain("9 Elm Court");
  expect(text()).not.toContain("12 Alder Way");

  await press("Review");
  expect(text()).toContain("Is this the right reply?");
  expect(view.querySelector("del, .line-through")).not.toBeNull();
});
