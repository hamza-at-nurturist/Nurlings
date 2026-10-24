import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import * as timeline from "./brand-splash-timeline";

// Typecheck and the plain unit tests run worklets as ordinary functions, so they cannot see a
// worklet that only breaks on the UI thread. These tests compile the timeline with the same
// worklets Babel plugin the app bundle uses and run each worklet the way the UI thread does: its
// serialized code, in an empty context, with only the values the plugin captured.

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(mobileRoot, "package.json"));
const workletsPlugin = require.resolve("react-native-worklets/plugin");
const babelPresetExpo = require.resolve("babel-preset-expo/package.json", {
  paths: [require.resolve("expo/package.json")],
});
const babel = require(require.resolve("@babel/core", { paths: [workletsPlugin] })) as {
  transformFileSync(file: string, options: object): { code: string };
};
const babelOptions = {
  babelrc: false,
  configFile: false,
  presets: [require.resolve("@babel/preset-typescript", { paths: [babelPresetExpo] })],
  plugins: [
    workletsPlugin,
    require.resolve("@babel/plugin-transform-modules-commonjs", { paths: [babelPresetExpo] }),
  ],
};

type Worklet = ((...args: unknown[]) => unknown) & {
  __initData?: { code: string };
  __closure?: Record<string, unknown>;
};

/** Loads compiled module code, as the app bundle would see it. */
function load(code: string): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> };
  new Function("exports", "module", "global", code)(module.exports, module, globalThis);
  return module.exports;
}

/** The worklet as the UI thread runs it: its own code plus its captured closure, nothing else. */
function onUiThread(worklet: Worklet): (...args: unknown[]) => unknown {
  if (!worklet.__initData) throw new Error(`${worklet.name} is not a worklet`);
  const closure: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(worklet.__closure ?? {})) {
    closure[name] =
      typeof value === "function" && (value as Worklet).__initData
        ? onUiThread(value as Worklet)
        : value;
  }
  const fn = vm.runInNewContext(`(${worklet.__initData.code})`, {}) as (
    ...args: unknown[]
  ) => unknown;
  return (...args) => fn.apply({ __closure: closure }, args);
}

const plain: Record<string, unknown> = { ...timeline };
const compiled = load(
  babel.transformFileSync(join(mobileRoot, "lib/brand-splash-timeline.ts"), babelOptions).code,
);

const {
  CHIEF_BLINK,
  CHIEF_BODY,
  CHIEF_EXIT,
  CHIEF_LOOK,
  CHIEF_OPACITY,
  CHIEF_WINK,
  EASE_IN_OUT,
  GRADIENT_RING,
  ORB_BLINK,
  ORB_BODY,
  ORB_EXIT,
} = timeline;

/** Every worklet in the timeline, with inputs from each phase of the run. */
const calls: Array<[keyof typeof timeline, unknown[][]]> = [
  ["easeValue", [[0.3, timeline.EASE_IN]]],
  [
    "sampleTrack",
    [
      [CHIEF_BODY, -1, EASE_IN_OUT],
      [CHIEF_BODY, 5.5, EASE_IN_OUT],
      [CHIEF_BODY, 100, EASE_IN_OUT],
    ],
  ],
  [
    "bodyStyle",
    [
      [0, 0, CHIEF_BODY, CHIEF_OPACITY, CHIEF_EXIT, 0.16],
      [40, 0, CHIEF_BODY, CHIEF_OPACITY, CHIEF_EXIT, 0.16],
      [100, 0, ORB_BODY, null, ORB_EXIT, 0.16],
      [100, 7, CHIEF_BODY, CHIEF_OPACITY, CHIEF_EXIT, 0.16],
    ],
  ],
  [
    "lookStyle",
    [
      [0, CHIEF_LOOK, 0.16],
      [30, CHIEF_LOOK, 0.16],
    ],
  ],
  [
    "blinkStyle",
    [
      [5, 0, CHIEF_BLINK, null, 0],
      [55, 0, CHIEF_BLINK, CHIEF_WINK, 0],
      [100, 90, ORB_BLINK, null, 6],
    ],
  ],
  [
    "ringStyle",
    [
      [0, GRADIENT_RING],
      [7, GRADIENT_RING],
    ],
  ],
  ["fireflyStyle", [[12_345, 17, 0.55, 800, 24, 0.55]]],
];

describe("splash worklets on the UI thread", () => {
  for (const [name, inputs] of calls) {
    it(`${name} runs with only what it captured, and matches the JS result`, () => {
      const onUi = onUiThread(compiled[name] as Worklet);
      for (const args of inputs) {
        const expected = (plain[name] as (...args: unknown[]) => unknown)(...args);
        expect(JSON.parse(JSON.stringify(onUi(...args)))).toEqual(expected);
      }
    });
  }

  it("covers every worklet the timeline exports", () => {
    const worklets = Object.entries(compiled)
      .filter(([, value]) => typeof value === "function" && (value as Worklet).__initData)
      .map(([name]) => name)
      .sort();
    expect(worklets).toEqual(calls.map(([name]) => name).sort());
  });

  it("has no default parameters, which a caller leaving them out would trip on the UI thread", () => {
    for (const [name] of calls) {
      const code = (compiled[name] as Worklet).__initData?.code ?? "";
      expect(code.slice(0, code.indexOf("{")), name).not.toContain("=");
    }
  });

  it("has no default parameters in the splash component's own worklets either", () => {
    for (const file of [
      "components/brand-splash/index.tsx",
      "components/brand-splash/fireflies.tsx",
    ]) {
      const { code } = babel.transformFileSync(join(mobileRoot, file), {
        ...babelOptions,
        presets: [[babelOptions.presets[0], { isTSX: true, allExtensions: true }]],
      });
      const worklets = [...code.matchAll(/code: "(function [^"]*?)\{/g)].map((match) => match[1]);
      expect(worklets.length, file).toBeGreaterThan(0);
      for (const head of worklets) expect(head, file).not.toContain("=");
    }
  });

  it("catches a worklet whose default parameter names a module value", () => {
    // The shape of the bug that blanked the app: fine as plain JS, a ReferenceError on the UI thread.
    const file = join(mkdtempSync(join(tmpdir(), "splash-worklet-")), "broken.ts");
    writeFileSync(
      file,
      `const STEP = 2;
       export function scale(value: number, by = STEP) { "worklet"; return value * by; }`,
    );
    const broken = load(babel.transformFileSync(file, babelOptions).code);
    expect((broken.scale as Worklet)(3)).toBe(6);
    expect(() => onUiThread(broken.scale as Worklet)(3)).toThrow(/STEP/);
  });
});
