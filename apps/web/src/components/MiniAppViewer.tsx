import { createStateStore, JSONUIProvider, Renderer } from "@json-render/react";
import { useLingui } from "@lingui/react/macro";
import {
  isMiniAppName,
  type MiniAppRefusal,
  type ParsedMiniApp,
  readMiniApp,
} from "@rakazo/mini-app";
import { cn } from "@rakazo/ui-web/lib/utils";
import { useEffect, useMemo } from "react";
import type { ArtifactDataLoader } from "../lib/artifact-data-fork";
import "../lib/mini-app/mini-app.css";
import { asText } from "../lib/mini-app/format";
import { registry } from "../lib/mini-app/registry";

export const MINI_APP_REFRESH_MS = 10_000;
const MESSAGE_LIMIT = 2000;

export { isMiniAppName };

/** The app, or why it is refused. The reason in words is for bots, so people only get the code. */
export function parseMiniApp(source: string): ParsedMiniApp | { error: MiniAppRefusal } {
  const read = readMiniApp(source);
  if (!("error" in read)) return read;
  console.warn("Mini app refused:", read.detail);
  return { error: read.error };
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
    <div
      className={cn(
        "mini-app h-full overflow-auto bg-background text-foreground",
        parsed.layout === "padded" && "p-6",
      )}
      data-testid="mini-app"
    >
      <JSONUIProvider registry={registry} store={store} handlers={handlers}>
        <Renderer spec={parsed.spec} registry={registry} />
      </JSONUIProvider>
    </div>
  );
}
