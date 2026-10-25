import { Trans, useLingui } from "@lingui/react/macro";
import type { Artifact, Bot } from "@rakazo/contracts";
import { TicketFileCard } from "./TicketFileCard";

/**
 * Files on the ticket: what you attached to comments and what its Nurlings attached while working
 * on it, each labelled with who added it. Nothing is shown when there is none.
 */
export function TicketFiles({ files, bots }: { files: Artifact[]; bots: Bot[] }) {
  const { t } = useLingui();
  const shown = files.filter((file) => file.botId);
  if (shown.length === 0) return null;
  return (
    <section data-testid="ticket-files" className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        <Trans>Files</Trans>
      </h3>
      <div className="flex flex-wrap gap-2">
        {shown.map((file) => (
          <figure key={file.id} data-testid="ticket-file" className="space-y-1">
            <TicketFileCard file={{ ...file, botId: file.botId as string }} />
            <figcaption className="px-1 text-xs text-muted-foreground">
              {file.runId ? bots.find((bot) => bot.id === file.botId)?.name : t`You`}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
