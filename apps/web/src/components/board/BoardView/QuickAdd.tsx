import { useLingui } from "@lingui/react/macro";
import { brand } from "@nurlings/brand";
import type { Bot } from "@rakazo/contracts";
import { TICKET_DESCRIPTION_MAX_LENGTH } from "@rakazo/contracts";
import { Button, cn, Textarea } from "@rakazo/ui-web";
import { ArrowUp } from "lucide-react";
import { useId, useState } from "react";
import { MentionPicker } from "../TicketModal/MentionPicker";
import { useMentionInput } from "../TicketModal/use-mention-input";
import type { QuickAddTicket } from "./quick-add";
import { quickAddTicket } from "./quick-add";

type Props = {
  bots: Bot[];
  /** Creates the ticket; a rejection keeps the text so nothing typed is lost. */
  onCreate: (ticket: QuickAddTicket) => Promise<void>;
  className?: string;
};

/** One line tells a Nurling what to do; `@` picks which one. */
export function QuickAdd({ bots, onCreate, className }: Props) {
  const { t } = useLingui();
  const pickerId = useId();
  const input = useMentionInput(bots);
  const { box, text, options, open, active } = input;
  const [busy, setBusy] = useState(false);
  const ticket = quickAddTicket(text, input.picked);
  const noun = brand.bot.singular;
  const prompt = t`Tell a ${noun} what to do…`;

  async function submit() {
    if (!ticket || busy) return;
    setBusy(true);
    try {
      await onCreate(ticket);
      input.reset();
    } catch {
      // The board shows the error; the text stays for another try.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      data-testid="quick-add"
      className={cn(
        "relative flex items-end gap-2 rounded-3xl border bg-muted/50 py-1 pr-1 pl-4",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {open ? (
        <MentionPicker
          id={pickerId}
          side="below"
          options={options}
          highlighted={active}
          onHighlight={input.setHighlighted}
          onPick={input.pick}
        />
      ) : null}
      <Textarea
        ref={box}
        aria-label={prompt}
        placeholder={prompt}
        aria-controls={open ? pickerId : undefined}
        aria-activedescendant={open ? `${pickerId}-${options[active]?.id}` : undefined}
        value={text}
        rows={1}
        maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
        disabled={busy}
        className="max-h-32 min-h-8 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
        onChange={input.onChange}
        onSelect={input.onSelect}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || input.pickerKey(event)) return;
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          void submit();
        }}
      />
      <Button
        type="submit"
        size="icon-sm"
        className="mb-0.5 shrink-0 rounded-full"
        aria-label={t`Add`}
        disabled={!ticket || busy}
      >
        <ArrowUp />
      </Button>
    </form>
  );
}
