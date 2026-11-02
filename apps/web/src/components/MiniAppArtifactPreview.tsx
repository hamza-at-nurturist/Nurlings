import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { ArtifactDataLoader } from "../lib/artifact-data-fork";
import { requestComposerDraft } from "../lib/composer-draft";
import { MiniAppViewer } from "./MiniAppViewer";

/**
 * A mini app opened from the Artifacts screen. Its askBot action leaves the message in the bot's
 * composer and opens that chat, so the person decides whether to send it.
 */
export function MiniAppArtifactPreview({
  source,
  botId,
  loadData,
}: {
  source: string;
  botId: string | null;
  loadData: ArtifactDataLoader;
}) {
  const navigate = useNavigate();
  const onAskBot = useCallback(
    (message: string) => {
      if (!botId) return;
      requestComposerDraft(`bot:${botId}`, message);
      navigate(`/app/${botId}`);
    },
    [botId, navigate],
  );
  return (
    <MiniAppViewer source={source} loadData={loadData} onAskBot={botId ? onAskBot : undefined} />
  );
}
