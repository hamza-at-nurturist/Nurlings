import { formatSpecIssues, type Spec, validateSpec } from "@json-render/core";
import { createStateStore, JSONUIProvider, Renderer } from "@json-render/react";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import type { ArtifactDataLoader } from "../lib/artifact-data-fork";
import { miniAppCatalog, usesOnlyTheCatalog } from "../lib/mini-app/catalog";
import { asText, registry } from "../lib/mini-app/registry";

export const MINI_APP_SUFFIX = ".app.json";
export const MINI_APP_MAX_BYTES = 200_000;
export const MINI_APP_REFRESH_MS = 10_000;
const MESSAGE_LIMIT = 2000;

export function isMiniAppName(name: string): boolean {
  return name.toLowerCase().endsWith(MINI_APP_SUFFIX);
}

const appFile = z.object({
  data: z.array(z.string().min(1).max(200)).max(8).default([]),
  spec: z.unknown(),
});

export type ParsedMiniApp = { spec: Spec; data: string[] };
export type MiniAppRefusal = "large" | "json" | "shape" | "unsupported" | "incomplete";

/** Why an app file cannot be drawn, or the parsed app. Nothing is drawn from a refused file. */
export function parseMiniApp(source: string): ParsedMiniApp | { error: MiniAppRefusal } {
  if (new TextEncoder().encode(source).length > MINI_APP_MAX_BYTES) return { error: "large" };
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch {
    return { error: "json" };
  }
  const file = appFile.safeParse(json);
  if (!file.success) return { error: "shape" };
  // The catalog's validate returns a copy without on, repeat and visible, so it only gates the
  // original spec, which is what gets drawn.
  const spec = withChildren(file.data.spec);
  if (!spec) return { error: "shape" };
  const checked = miniAppCatalog.validate(spec);
  if (!checked.success) return { error: "unsupported" };
  if (!usesOnlyTheCatalog(spec)) return { error: "unsupported" };
  const structure = validateSpec(spec);
  if (!structure.valid) {
    console.warn("Mini app spec rejected", formatSpecIssues(structure.issues));
    return { error: "incomplete" };
  }
  return { spec, data: file.data.data };
}

/** json-render wants an explicit children list on every element, leaves included. */
function withChildren(value: unknown): Spec | null {
  if (!value || typeof value !== "object") return null;
  const { elements } = value as { elements?: unknown };
  if (!elements || typeof elements !== "object") return null;
  const filled = Object.fromEntries(
    Object.entries(elements).map(([key, element]) => [
      key,
      element && typeof element === "object" && !("children" in element)
        ? { ...element, children: [] }
        : element,
    ]),
  );
  return { ...(value as object), elements: filled } as Spec;
}

/** The key a data file has in state: its name without the extension. */
function dataKey(name: string): string {
  return name.replace(/\.json$/i, "");
}

/**
 * Draws a mini app: a json-render spec made of the app's own components. The data files it names
 * are JSON artifacts of the same bot, read with the person's session and read again on a timer.
 * The one action, askBot, hands a message to the bot's composer; nothing is sent from here.
 */
export function MiniAppViewer({
  source,
  loadData,
  onAskBot,
}: {
  source: string;
  loadData?: ArtifactDataLoader;
  onAskBot?: (message: string) => void;
}) {
  const { t } = useLingui();
  const app = useMemo(() => parseMiniApp(source), [source]);
  const parsed = "error" in app ? null : app;
  const store = useMemo(
    () => createStateStore({ ...(parsed?.spec.state ?? {}), data: {} }),
    [parsed],
  );

  useEffect(() => {
    if (!parsed || !loadData || parsed.data.length === 0) return;
    let cancelled = false;
    const read = async () => {
      const entries = await Promise.all(
        parsed.data.map(async (name) => {
          try {
            return [dataKey(name), await loadData(name)] as const;
          } catch {
            return [dataKey(name), null] as const;
          }
        }),
      );
      if (!cancelled) store.set("/data", Object.fromEntries(entries));
    };
    void read();
    const timer = setInterval(() => void read(), MINI_APP_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [parsed, loadData, store]);

  const handlers = useMemo(
    () => ({
      askBot: (params: Record<string, unknown>) => {
        // Inside a repeated item, json-render hands an action the item field's state path, not its
        // value, so a path under /data is read from the store.
        const raw = asText(params.message);
        const value = raw.startsWith("/data/") ? asText(store.get(raw)) : raw;
        const message = value.slice(0, MESSAGE_LIMIT);
        if (message) onAskBot?.(message);
      },
    }),
    [onAskBot, store],
  );

  if (!parsed) {
    const reasons: Record<MiniAppRefusal, string> = {
      large: t`This app is too large to show.`,
      json: t`This app file is not valid JSON.`,
      shape: t`This app file is missing its data list or spec.`,
      unsupported: t`This app uses something that cannot be shown.`,
      incomplete: t`This app is incomplete and cannot be shown.`,
    };
    return (
      <p role="alert" className="p-6 text-sm text-muted-foreground">
        {"error" in app ? reasons[app.error] : ""}
      </p>
    );
  }
  return (
    <div className="h-full overflow-auto p-6" data-testid="mini-app">
      <JSONUIProvider registry={registry} store={store} handlers={handlers}>
        <Renderer spec={parsed.spec} registry={registry} />
      </JSONUIProvider>
    </div>
  );
}
