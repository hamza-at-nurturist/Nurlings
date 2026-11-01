import { type RefObject, useEffect } from "react";
import { decodeArtifactBase64 } from "./artifact-open";
import { rpc } from "./rpc";

/** Reads the latest version of a JSON artifact by name; null when it is missing or unreadable. */
export type ArtifactDataLoader = (name: string) => Promise<unknown>;

const MAX_DATA_BYTES = 1_000_000;

/**
 * Lets a dashboard read JSON artifacts its bot made. The page never touches the network: it posts
 * a request, the app reads the artifact with the user's own session, and posts the parsed value
 * back. Only artifacts of the dashboard's own bot are visible.
 */
export function artifactDataLoader(botId: string | null): ArtifactDataLoader {
  return async (name) => {
    const page = await rpc.artifacts.listSpace({ botId: botId ?? undefined, limit: 60 });
    const item = page.items.find(
      (entry) => entry.name === name && entry.mimeType === "application/json",
    );
    if (!item || item.size > MAX_DATA_BYTES) return null;
    const latest = (await rpc.artifacts.listVersions({ familyId: item.id }))[0];
    const artifact = await rpc.artifacts.getById({ artifactId: latest?.id ?? item.id });
    const text = new TextDecoder("utf-8").decode(decodeArtifactBase64(artifact.contentBase64));
    return JSON.parse(text);
  };
}

/** Answers `nurlings:data` requests that come from the preview frame, and only from that frame. */
export function useArtifactDataRelay(
  frame: RefObject<HTMLIFrameElement | null>,
  loadData: ArtifactDataLoader | undefined,
) {
  useEffect(() => {
    if (!loadData) return;
    const onMessage = (event: MessageEvent) => {
      const target = frame.current?.contentWindow;
      const request = event.data as { type?: unknown; id?: unknown; name?: unknown } | null;
      if (!target || event.source !== target || request?.type !== "nurlings:data") return;
      if (typeof request.id !== "string" || typeof request.name !== "string") return;
      const id = request.id;
      const reply = (value: unknown) =>
        target.postMessage({ type: "nurlings:data:result", id, value }, "*");
      loadData(request.name.slice(0, 200)).then(reply, () => reply(null));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frame, loadData]);
}
