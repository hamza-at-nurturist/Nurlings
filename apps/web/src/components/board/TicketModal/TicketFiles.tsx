import { Trans, useLingui } from "@lingui/react/macro";
import type { Artifact, Bot } from "@rakazo/contracts";
import { TicketFileCard } from "./TicketFileCard";

/** Who added a ticket file: its Nurling when a run attached it, else the user. */
export function fileProducer(file: Artifact, bots: Bot[], you: string): string | undefined {
  return file.runId ? bots.find((bot) => bot.id === file.botId)?.name : you;
}

/**
 * Files on the ticket: what you attached to comments and what its Nurlings attached while working
 * on it, each carrying who added it in its meta line. Nothing is shown when there is none.
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
          <div key={file.id} data-testid="ticket-file">
            <TicketFileCard
              file={{ ...file, botId: file.botId as string }}
              producer={fileProducer(file, bots, t`You`)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
