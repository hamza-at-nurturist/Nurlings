// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { leadPipelineApp, leadPipelineData } from "../lib/mini-app/lead-pipeline-example";
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
