import { brand } from "@nurlings/brand";
import type { Bot } from "@rakazo/contracts";
import { TICKET_DESCRIPTION_MAX_LENGTH } from "@rakazo/contracts";
import { quickAddTicket } from "@rakazo/core/nurlings-board";
import { useState } from "react";
import { rpc } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { errorText } from "../../lib/user-error";
import { ComposerBar } from "./composer-bar";

/** One line tells a Nurling what to do; `@` picks which one. No @ leaves it to Chief. */
export function QuickAdd({
  bots,
  onCreated,
  onError,
}: {
  bots: Bot[];
  onCreated: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const noun = brand.bot.singular;
  return (
    <ComposerBar
      testID="quick-add"
      bots={bots}
      busy={busy}
      maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
      placeholder={t("Tell a {noun} what to do…", { noun })}
      onSend={async ({ text, picked }) => {
        const ticket = quickAddTicket(text, picked);
        if (!ticket) return false;
        setBusy(true);
        onError("");
        try {
          await rpc("tickets/create", ticket);
          onCreated();
          return true;
        } catch (cause) {
          onError(errorText(cause));
          return false;
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
