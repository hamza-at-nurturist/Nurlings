// @vitest-environment jsdom
import { brand } from "@nurlings/brand";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { Wordmark } from "./bot-avatar.js";
import { BrandMark } from "./brand-mark.js";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("draws the configured mark, hidden from assistive technology and filled by text colour", async () => {
  await act(async () => root.render(<BrandMark className="size-5" />));
  const svg = host.querySelector("svg");
  expect(svg?.getAttribute("viewBox")).toBe(brand.mark.viewBox);
  expect(svg?.getAttribute("aria-hidden")).toBe("true");
  expect(svg?.getAttribute("fill")).toBe("currentColor");
  expect(svg?.classList.contains("size-5")).toBe(true);
  expect(host.querySelector("path")?.getAttribute("d")).toBe(brand.mark.path);
});

it("shows the product name in the wordmark, never the upstream name or its face logo", async () => {
  await act(async () => root.render(<Wordmark />));
  expect(host.textContent).toBe(brand.name);
  expect(host.textContent).not.toContain("Rakazo");
  expect(host.querySelector("svg path")?.getAttribute("d")).toBe(brand.mark.path);
  // The upstream mark was two rounded dots drawn with spans.
  expect(host.querySelectorAll("span.rounded-full").length).toBe(0);
});
