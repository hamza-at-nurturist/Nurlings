// @vitest-environment jsdom
import { brand } from "@nurlings/brand";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { BrandAnimation } from "./brand-animation.js";

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

it("shows the intro and the loader as plain decorative images on the navy plate", async () => {
  await act(async () =>
    root.render(
      <>
        <BrandAnimation variant="intro" />
        <BrandAnimation variant="loader" />
      </>,
    ),
  );
  const plates = [...host.querySelectorAll<HTMLElement>("[data-brand-animation]")];
  expect(plates.map((plate) => plate.dataset.brandAnimation)).toEqual(["intro", "loader"]);
  for (const plate of plates) {
    expect(plate.getAttribute("aria-hidden")).toBe("true");
    expect(plate.style.backgroundColor).not.toBe("");
  }
  const [intro, loader] = [...host.querySelectorAll("img")];
  // Small SVGs are inlined by the bundler, so read the animation's class name from the source.
  const source = (image?: Element | null) => decodeURIComponent(image?.getAttribute("src") ?? "");
  expect(source(intro)).toContain("nl-intro");
  expect(source(loader)).toContain("nl-loop");
  expect(intro?.getAttribute("alt")).toBe("");
});

it("draws the static mark when the animation cannot load", async () => {
  await act(async () => root.render(<BrandAnimation variant="loader" />));
  const image = host.querySelector("img") as HTMLImageElement;
  await act(async () => {
    image.dispatchEvent(new Event("error"));
  });
  expect(host.querySelector("img")).toBeNull();
  expect(host.querySelector("svg path")?.getAttribute("d")).toBe(brand.mark.blob);
});

it("draws the static mark for people who asked for less motion", async () => {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  try {
    await act(async () => root.render(<BrandAnimation variant="intro" />));
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("svg path")?.getAttribute("d")).toBe(brand.mark.blob);
  } finally {
    window.matchMedia = original;
  }
});
