import { Trans } from "@lingui/react/macro";
import type { Artifact } from "@rakazo/contracts";
import { ArtifactFileCard } from "../../ArtifactFileCard";

/** What the owner attached while working on the ticket; nothing is shown when there is none. */
export function TicketFiles({ files }: { files: Artifact[] }) {
  const shown = files.filter((file) => file.botId);
  if (shown.length === 0) return null;
  return (
    <section data-testid="ticket-files" className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        <Trans>Files</Trans>
      </h3>
      <div className="flex flex-wrap gap-2">
        {shown.map((file) => (
          <ArtifactFileCard
            key={file.id}
            target={{ botId: file.botId as string }}
            artifactId={file.id}
            name={file.name}
            mimeType={file.mimeType}
            size={file.size}
          />
        ))}
      </div>
    </section>
  );
}
