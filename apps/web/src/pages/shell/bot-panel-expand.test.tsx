// @vitest-environment jsdom

import type { ComponentProps } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => `${text}${index > 0 ? values[index - 1] : ""}${part}`, "");
  return { useLingui: () => ({ t }) };
});
vi.mock("@rakazo/ui-web", () => ({
  Button: ({
    variant: _variant,
    size: _size,
    ...props
  }: ComponentProps<"button"> & { variant?: string; size?: string }) => (
    <button type="button" {...props} />
  ),
}));

import { BotPanelExpand } from "./bot-panel-expand";

let container: HTMLDivElement;
let root: Root;

const marker = () => container.querySelector("[data-bot-panel-expanded]");
const button = () => container.querySelector("button") as HTMLButtonElement;

function press(target: Element | Window, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<BotPanelExpand />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("BotPanelExpand", () => {
  it("toggles the marker and the accessible name with the button", () => {
    expect(button().getAttribute("aria-label")).toBe("Expand panel");
    expect(marker()).toBeNull();
    act(() => button().click());
    expect(button().getAttribute("aria-label")).toBe("Collapse panel");
    expect(marker()).not.toBeNull();
    act(() => button().click());
    expect(button().getAttribute("aria-label")).toBe("Expand panel");
    expect(marker()).toBeNull();
  });

  it("collapses on Escape", () => {
    act(() => button().click());
    press(document.body);
    expect(marker()).toBeNull();
  });

  it("leaves Escape to a single-line field, an open dialog, or a handled event", () => {
    act(() => button().click());
    const input = document.createElement("input");
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const inDialog = document.createElement("button");
    dialog.append(inDialog);
    container.append(input, dialog);
    press(input);
    press(inDialog);
    expect(marker()).not.toBeNull();
    const handled = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    handled.preventDefault();
    act(() => {
      window.dispatchEvent(handled);
    });
    expect(marker()).not.toBeNull();
  });

  it("collapses on Escape from a textarea, which has no Escape of its own", () => {
    act(() => button().click());
    const textarea = document.createElement("textarea");
    container.append(textarea);
    press(textarea);
    expect(marker()).toBeNull();
  });

  it("stops listening once collapsed", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    act(() => button().click());
    act(() => button().click());
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
    remove.mockRestore();
  });
});
