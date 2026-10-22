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

it("draws the configured mark, hidden from assistive technology, with the blob in the text colour and a gradient orb", async () => {
  await act(async () => root.render(<BrandMark className="size-5" />));
  const svg = host.querySelector("svg");
  expect(svg?.getAttribute("viewBox")).toBe(brand.mark.viewBox);
  expect(svg?.getAttribute("aria-hidden")).toBe("true");
  expect(svg?.classList.contains("size-5")).toBe(true);
  const [blob, orb] = [...host.querySelectorAll("path")];
  expect(blob?.getAttribute("d")).toBe(brand.mark.blob);
  expect(blob?.getAttribute("fill")).toBe("currentColor");
  expect(orb?.getAttribute("d")).toBe(brand.mark.orb);
  const gradient = host.querySelector("linearGradient");
  expect(orb?.getAttribute("fill")).toBe(`url(#${gradient?.id})`);
  expect([...host.querySelectorAll("stop")].map((stop) => stop.getAttribute("stop-color"))).toEqual(
    brand.colors.orbGradient,
  );
});

it("draws only the blob in the small variant", async () => {
  await act(async () => root.render(<BrandMark variant="small" />));
  expect(host.querySelector("svg")?.getAttribute("viewBox")).toBe(brand.mark.smallViewBox);
  expect(host.querySelectorAll("path").length).toBe(1);
  expect(host.querySelector("linearGradient")).toBeNull();
});

it("gives two marks on one page separate gradients", async () => {
  await act(async () =>
    root.render(
      <>
        <BrandMark />
        <BrandMark />
      </>,
    ),
  );
  const ids = [...host.querySelectorAll("linearGradient")].map((gradient) => gradient.id);
  expect(new Set(ids).size).toBe(2);
});

it("shows the product name in the wordmark on the navy plate, never the upstream name or its face logo", async () => {
  await act(async () => root.render(<Wordmark />));
  expect(host.textContent).toBe(brand.name);
  expect(host.textContent).not.toContain("Rakazo");
  expect(host.querySelector("svg path")?.getAttribute("d")).toBe(brand.mark.blob);
  const plate = host.querySelector("svg")?.parentElement as HTMLElement;
  expect(plate.style.backgroundColor).not.toBe("");
});

it("sets the product name in the brand's wordmark typeface and nowhere else", async () => {
  await act(async () => root.render(<Wordmark />));
  const name = [...host.querySelectorAll("span")].find((span) => span.textContent === brand.name);
  expect(name?.style.fontFamily).toContain(brand.wordmarkFont.family);
  expect(name?.style.fontFamily).toContain("sans-serif");
  expect(name?.style.fontWeight).toBe(String(brand.wordmarkFont.weight));
  expect(name?.style.letterSpacing).toBe(brand.wordmarkFont.letterSpacing);
  // The mark's plate is not set in it.
  expect(host.querySelector("svg")?.parentElement?.style.fontFamily).toBe("");
  // The upstream mark was two rounded dots drawn with spans.
  expect(host.querySelectorAll("span.rounded-full").length).toBe(0);
});
