import { formatSpecIssues, type Spec, validateSpec } from "@json-render/core";
import { z } from "zod";
import { catalogProblem, miniAppCatalog } from "./catalog.js";
import { flattenSpec } from "./nested.js";

export const MINI_APP_SUFFIX = ".app.json";
export const MINI_APP_MAX_BYTES = 200_000;

export function isMiniAppName(name: string): boolean {
  return name.toLowerCase().endsWith(MINI_APP_SUFFIX);
}

const appFile = z.object({
  data: z.array(z.string().min(1).max(200)).max(8).default([]),
  /** full draws edge to edge, for an app with its own sidebar and header. */
  layout: z.enum(["padded", "full"]).default("padded"),
  spec: z.unknown(),
});

export type ParsedMiniApp = { spec: Spec; data: string[]; layout: "padded" | "full" };
export type MiniAppRefusal = "large" | "json" | "shape" | "unsupported" | "incomplete";
export type MiniAppFailure = { error: MiniAppRefusal; detail: string };

/**
 * Why an app file cannot be drawn, or the parsed app. Nothing is drawn from a refused file.
 * `detail` says what is wrong in words a bot can act on; people see only the refusal code.
 */
export function readMiniApp(source: string): ParsedMiniApp | MiniAppFailure {
  if (new TextEncoder().encode(source).length > MINI_APP_MAX_BYTES) {
    return {
      error: "large",
      detail: `file is over ${MINI_APP_MAX_BYTES} bytes; split the data out`,
    };
  }
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch (error) {
    return {
      error: "json",
      detail: `not valid JSON: ${error instanceof Error ? error.message : "parse error"}`,
    };
  }
  const file = appFile.safeParse(json);
  if (!file.success) {
    const issue = file.error.issues[0];
    return {
      error: "shape",
      detail:
        `top level must be {"data"?: [..], "layout"?: "padded"|"full", "spec": {..}}: ${issue?.path.join(".") ?? ""} ${issue?.message ?? "invalid"}`.trim(),
    };
  }
  const flat = flattenSpec(file.data.spec);
  if ("problem" in flat) return { error: "shape", detail: flat.problem };
  const spec = flat as unknown as Spec;
  const problem = catalogProblem(flat);
  if (problem) return { error: "unsupported", detail: problem };
  // The catalog's own validate returns a copy without on, repeat and visible, so it only gates the
  // original spec, which is what gets drawn.
  if (!miniAppCatalog.validate(spec).success) {
    return { error: "unsupported", detail: "uses a component the catalog does not have" };
  }
  // The data a list repeats over arrives after the app opens, so it is not in the spec's own state;
  // that is the one structural rule that does not apply here.
  const broken = validateSpec(spec).issues.filter(
    (issue) => issue.severity === "error" && issue.code !== "repeat_state_mismatch",
  );
  if (broken.length > 0) return { error: "incomplete", detail: formatSpecIssues(broken) };
  return { spec, data: file.data.data, layout: file.data.layout };
}
