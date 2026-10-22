// @vitest-environment jsdom
import { brand } from "@nurlings/brand";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WelcomePage } from "./Welcome";

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@rakazo/ui-web", () => ({ BrandMark: () => <svg data-testid="brand-mark" /> }));
vi.mock("./WindowChrome", () => ({ WindowChrome: () => null }));

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

it("greets with the product name, mark and tagline, never the upstream name", async () => {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <WelcomePage />
      </MemoryRouter>,
    ),
  );
  expect(host.querySelector("h1")?.textContent).toBe(brand.name);
  expect(host.querySelector('[data-testid="brand-mark"]')).not.toBeNull();
  expect(host.textContent).toContain(brand.tagline);
  expect(host.textContent).not.toContain("Rakazo");
});
