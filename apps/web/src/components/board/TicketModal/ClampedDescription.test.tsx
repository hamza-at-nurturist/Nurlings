// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@lingui/react/macro", () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join("") }),
  Trans: ({ children }: { children: ReactNode }) => children,
}));

import { ClampedDescription } from "./ClampedDescription";

let cleanup: (() => void) | undefined;

async function render(value: string, scrollHeight: number) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(60);
  const onSave = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(<ClampedDescription value={value} fieldClassName="" onSave={onSave} />),
  );
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return { container, onSave };
}

const button = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll("button")].find((row) => row.textContent === name);

afterEach(() => {
  cleanup?.();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ClampedDescription", () => {
  it("clamps a long description and shows the rest on Show more", async () => {
    const { container } = await render("A long brief", 120);
    const text = container.querySelector("[data-testid='ticket-description-text']");
    expect(text?.className).toContain("line-clamp-3");
    await act(async () => button(container, "Show more")?.click());
    expect(text?.className).not.toContain("line-clamp-3");
    expect(button(container, "Show more")).toBeUndefined();
  });

  it("has no Show more when it fits", async () => {
    const { container } = await render("Short", 40);
    expect(button(container, "Show more")).toBeUndefined();
  });

  it("edits in place when tapped and saves on blur", async () => {
    const { container, onSave } = await render("Short", 40);
    await act(async () =>
      (container.querySelector("[data-testid='ticket-description-text']") as HTMLElement).click(),
    );
    const field = container.querySelector("textarea") as HTMLTextAreaElement;
    field.value = "Longer brief";
    await act(async () => field.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    expect(onSave).toHaveBeenCalledWith("Longer brief");
  });

  it("is the editor straight away when empty", async () => {
    const { container } = await render("", 0);
    expect(container.querySelector("textarea")).toBeTruthy();
  });
});
