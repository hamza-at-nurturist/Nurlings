import { Trans, useLingui } from "@lingui/react/macro";
import type { Artifact, Bot } from "@rakazo/contracts";
import { TicketFileCard } from "./TicketFileCard";
import { THUMBNAIL_MIME_TYPES, TicketImage } from "./TicketImage";

/** Who added a ticket file: its Nurling when a run attached it, else the user. */
export function fileProducer(file: Artifact, bots: Bot[], you: string): string | undefined {
  return file.runId ? bots.find((bot) => bot.id === file.botId)?.name : you;
}

/**
 * Files on the ticket: what you attached to comments and what its Nurlings attached while working
 * on it, each carrying who added it in its meta line. Images come first as a thumbnail grid; on a
 * narrow sheet the grid has three columns and the other cards take the full width. Nothing is
 * shown when there is none.
 */
export function TicketFiles({
  files,
  bots,
  narrow = false,
}: {
  files: Artifact[];
  bots: Bot[];
  narrow?: boolean;
}) {
  const { t } = useLingui();
  const shown = files.filter((file) => file.botId);
  if (shown.length === 0) return null;
  const images = shown.filter((file) => THUMBNAIL_MIME_TYPES.has(file.mimeType));
  const others = shown.filter((file) => !THUMBNAIL_MIME_TYPES.has(file.mimeType));
  return (
    <section data-testid="ticket-files" className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        <Trans>Files</Trans>
      </h3>
      {images.length ? (
        <div
          data-testid="ticket-images"
          className={`grid gap-2 ${narrow ? "grid-cols-3" : "grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]"}`}
        >
          {images.map((file) => (
            <TicketImage key={file.id} file={{ ...file, botId: file.botId as string }} />
          ))}
        </div>
      ) : null}
      {others.length ? (
        <div className={narrow ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
          {others.map((file) => (
            <div key={file.id} data-testid="ticket-file">
              <TicketFileCard
                file={{ ...file, botId: file.botId as string }}
                producer={fileProducer(file, bots, t`You`)}
                className={narrow ? "w-full" : undefined}
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
