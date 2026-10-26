// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import ts from "typescript";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const testFileUrl = import.meta.url;
const home = readFileSync(new URL("../../app/index.tsx", testFileUrl), "utf8");

function slice(start: string, end: string) {
  const from = home.indexOf(start);
  const to = home.indexOf(end, from);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return home.slice(from, to);
}
function evaluate(source: string, scope: Record<string, unknown>) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(scope), compiled)(...Object.values(scope));
}
const t = (text: string) => text;

beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));
afterEach(() => vi.unstubAllGlobals());

function nativeHeaderItems(boardEnabled: boolean, push = vi.fn()) {
  const setOptions = vi.fn();
  evaluate(slice("  useLayoutEffect(() => {\n    if (!nativeHeader)", "  const openBot ="), {
    useLayoutEffect: (effect: () => void) => effect(),
    nativeHeader: true,
    boardEnabled,
    navigation: { setOptions },
    ready: true,
    hasSession: true,
    initials: "A",
    activityMode: false,
    toggleActivityMode: vi.fn(),
    runCreateAction: vi.fn(),
    router: { push },
    t,
    locale: "en",
  });
  return setOptions.mock.calls[0]![0].unstable_headerRightItems() as Array<{
    accessibilityLabel: string;
    onPress?: () => void;
  }>;
}

it("shows a Board item in the native home header only while the board is enabled", () => {
  const push = vi.fn();
  const on = nativeHeaderItems(true, push);
  expect(on.map((item) => item.accessibilityLabel)).toEqual([
    "Activity",
    "Search",
    "Board",
    "Create",
  ]);
  on.find((item) => item.accessibilityLabel === "Board")!.onPress!();
  expect(push).toHaveBeenCalledWith("/board");
  expect(nativeHeaderItems(false).map((item) => item.accessibilityLabel)).toEqual([
    "Activity",
    "Search",
    "Create",
  ]);
});

it.each([true, false])(
  "shows the Board button in the fallback header when enabled: %s",
  (enabled) => {
    const header = slice(
      "      {nativeHeader ? null : (",
      "      <SelectedChatContext.Provider",
    ).trim();
    const push = vi.fn();
    const Group = ({
      children,
      accessibilityLabel,
    }: {
      children?: ReactNode;
      accessibilityLabel?: string;
    }) => <fieldset aria-label={accessibilityLabel}>{children}</fieldset>;
    const element = evaluate(`return <>${header}</>;`, {
      React,
      nativeHeader: false,
      boardEnabled: enabled,
      View: Group,
      HeaderButton: ({
        accessibilityLabel,
        onPress,
      }: {
        accessibilityLabel: string;
        onPress: () => void;
      }) => <button type="button" aria-label={accessibilityLabel} onClick={onPress} />,
      Text: Group,
      NativeSymbol: () => null,
      MenuView: Group,
      styles: {},
      insets: { top: 0 },
      columnInsets: { left: 0, right: 0 },
      t,
      router: { push },
      initials: "A",
      activityMode: false,
      toggleActivityMode: vi.fn(),
      tokens: {},
      Platform: { OS: "android" },
      openCreateChooser: vi.fn(),
      appearance: "light",
      runCreateAction: vi.fn(),
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      act(() => root.render(element));
      const labels = Array.from(container.querySelectorAll("[aria-label]"), (node) =>
        node.getAttribute("aria-label"),
      );
      expect(labels.includes("Board")).toBe(enabled);
      if (enabled) {
        act(() => container.querySelector<HTMLButtonElement>('[aria-label="Board"]')!.click());
        expect(push).toHaveBeenCalledWith("/board");
      }
    } finally {
      act(() => root.unmount());
    }
  },
);
