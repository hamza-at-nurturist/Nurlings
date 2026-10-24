import { useLingui } from "@lingui/react/macro";
import type { TicketComment } from "@rakazo/contracts";
import { TICKET_COMMENT_MAX_LENGTH } from "@rakazo/contracts";
import { Button, Textarea } from "@rakazo/ui-web";
import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";

type Props = {
  ticketId: string;
  onSent: (comment: TicketComment) => void;
  onError: (message: string) => void;
};

export function ReplyBox({ ticketId, onSent, onError }: Props) {
  const { t } = useLingui();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const canSend = !busy && body.trim().length > 0;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    onError("");
    try {
      onSent(await rpc.tickets.comment({ ticketId, body }));
      setBody("");
    } catch (cause) {
      onError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <Textarea
        aria-label={t`Reply`}
        placeholder={t`Reply`}
        value={body}
        maxLength={TICKET_COMMENT_MAX_LENGTH}
        rows={1}
        className="max-h-40 min-h-11 resize-none rounded-2xl py-2.5 pr-12"
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          event.preventDefault();
          void send();
        }}
      />
      <Button
        type="submit"
        size="icon-sm"
        className="absolute right-2 bottom-2 rounded-full"
        aria-label={t`Send`}
        disabled={!canSend}
      >
        <ArrowUp />
      </Button>
    </form>
  );
}
