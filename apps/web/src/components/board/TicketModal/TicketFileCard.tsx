import { useLingui } from "@lingui/react/macro";
import { isAttachmentAudioMimeType } from "@rakazo/contracts";
import { attachmentExtensionForMimeType, formatFileSize } from "@rakazo/core";
import { useState } from "react";
import { downloadArtifact } from "../../../lib/artifact-open";
import { ArtifactFileCard } from "../../ArtifactFileCard";

/** The types `ArtifactFileCard` previews; it shows every other type as its MIME type. */
const PREVIEWED_BY_SHARED_CARD = new Set([
  "text/markdown",
  "text/html",
  "application/pdf",
  "video/mp4",
]);

/** "TXT" from the name's extension, else from the type's usual one, else the type itself. */
export function shortFileType(name: string, mimeType: string): string {
  const dot = name.lastIndexOf(".");
  const extension =
    dot > 0 && dot < name.length - 1
      ? name.slice(dot + 1)
      : attachmentExtensionForMimeType(mimeType).replace(/^\./, "");
  return extension ? extension.toUpperCase() : mimeType;
}

/**
 * A ticket file, in Files and on a comment: the shared card for previewable and audio files, and a download card reading
 * "TXT · 22 B" for the rest, where the shared card would show the raw MIME type.
 */
export function TicketFileCard({
  file,
}: {
  file: { id: string; botId: string; name: string; mimeType: string; size: number };
}) {
  const { t } = useLingui();
  const [error, setError] = useState<string | null>(null);
  if (PREVIEWED_BY_SHARED_CARD.has(file.mimeType) || isAttachmentAudioMimeType(file.mimeType))
    return (
      <ArtifactFileCard
        target={{ botId: file.botId }}
        artifactId={file.id}
        name={file.name}
        mimeType={file.mimeType}
        size={file.size}
      />
    );
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          void downloadArtifact({ botId: file.botId }, file.id, file.name, file.mimeType).catch(
            () => setError(t`Could not download ${file.name}. Try again.`),
          );
        }}
        className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-[14px] text-foreground hover:bg-accent"
      >
        <div className="font-medium">{file.name}</div>
        <div className="mt-1 text-muted-foreground">
          {shortFileType(file.name, file.mimeType)} · {formatFileSize(file.size)}
        </div>
      </button>
      {error ? (
        <div role="alert" className="mt-2 text-left text-[13px] text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
