// @vitest-environment jsdom
import type { ServerUpdateStatus } from "@rakazo/contracts";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { hasServerUpdates, SoftwareUpdateSection } from "./SoftwareUpdateSection";

vi.mock("@lingui/react/macro", () => ({
  useLingui: () => ({
    t: (strings: TemplateStringsArray, ...values: unknown[]) =>
      strings.reduce((text, part, index) => text + part + (values[index] ?? ""), ""),
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
}));

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

it("shows nothing for an install that cannot update itself, as a switched-off deployment reports", async () => {
  // The server reports a non-sidecar install kind when self-update is switched off.
  const status = { installKind: "compose", supported: false } as unknown as ServerUpdateStatus;
  const load = { status, error: null, loading: false };
  expect(hasServerUpdates(load)).toBe(false);
  await act(async () => root.render(<SoftwareUpdateSection load={load} />));
  expect(host.innerHTML).toBe("");
});
