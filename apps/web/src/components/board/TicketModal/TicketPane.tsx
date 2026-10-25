import { Trans, useLingui } from "@lingui/react/macro";
import type { Artifact, Bot, Ticket } from "@rakazo/contracts";
import { TICKET_DESCRIPTION_MAX_LENGTH, TICKET_TITLE_MAX_LENGTH } from "@rakazo/contracts";
import { DialogTitle, Textarea } from "@rakazo/ui-web";
import type { ReactNode } from "react";
import { ClampedDescription } from "./ClampedDescription";
import type { PropertiesPatch } from "./Properties";
import { Properties } from "./Properties";
import { TicketFiles } from "./TicketFiles";

type Props = {
  ticket: Ticket;
  bots: Bot[];
  timeZone: string;
  busy: boolean;
  files: Artifact[];
  failure: string;
  narrow: boolean;
  /** Shown under the properties on the narrow sheet: the latest-activity row. */
  latest?: ReactNode;
  onUpdate: (patch: PropertiesPatch & Partial<{ title: string; description: string }>) => void;
};

const FIELD =
  "-mx-1 min-h-0 w-[calc(100%+0.5rem)] resize-none rounded-md border-transparent bg-transparent px-1 shadow-none hover:bg-muted/60 focus-visible:bg-muted";

/** The ticket itself: title, properties, description and files, on either layout. */
export function TicketPane({
  ticket,
  bots,
  timeZone,
  busy,
  files,
  failure,
  narrow,
  latest,
  onUpdate,
}: Props) {
  const { t } = useLingui();
  return (
    <>
      <DialogTitle className="sr-only">{ticket.title}</DialogTitle>
      <Textarea
        key={`title-${ticket.id}-${ticket.title}`}
        aria-label={t`Title`}
        data-testid="ticket-title"
        rows={1}
        defaultValue={ticket.title}
        maxLength={TICKET_TITLE_MAX_LENGTH}
        className={`${FIELD} py-1 text-2xl leading-tight font-semibold md:text-2xl`}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        onBlur={(event) => {
          const next = event.currentTarget.value.trim();
          if (next && next !== ticket.title) onUpdate({ title: next });
          else event.currentTarget.value = ticket.title;
        }}
      />
      <Properties
        ticket={ticket}
        bots={bots}
        timeZone={timeZone}
        disabled={busy}
        layout={narrow ? "chips" : "grid"}
        onChange={onUpdate}
      />
      {latest}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          <Trans>Description</Trans>
        </h3>
        {narrow ? (
          <ClampedDescription
            key={`description-${ticket.id}-${ticket.updatedAt}`}
            value={ticket.description ?? ""}
            fieldClassName={FIELD}
            onSave={(description) => onUpdate({ description })}
          />
        ) : (
          <Textarea
            key={`description-${ticket.id}-${ticket.updatedAt}`}
            aria-label={t`Description`}
            data-testid="ticket-description"
            defaultValue={ticket.description ?? ""}
            maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
            className={`${FIELD} min-h-20 py-1.5`}
            onBlur={(event) => {
              if (event.currentTarget.value !== (ticket.description ?? ""))
                onUpdate({ description: event.currentTarget.value });
            }}
          />
        )}
      </section>
      <TicketFiles files={files} bots={bots} narrow={narrow} />
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      ) : null}
    </>
  );
}
