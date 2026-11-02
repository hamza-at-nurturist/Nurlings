import { Trans } from "@lingui/react/macro";
import { Button } from "@rakazo/ui-web";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rakazo/ui-web/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { rpc } from "../../../lib/rpc";
import { errorText } from "../../../lib/user-error";

/** Deletes a ticket for good. Only people see this; Nurlings have no way to delete tickets. */
export function DeleteTicket({
  ticketId,
  refLabel,
  onDeleted,
}: {
  ticketId: string;
  refLabel: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await rpc.tickets.delete({ id: ticketId });
      onDeleted();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="text" size="sm" data-testid="ticket-delete" onClick={() => setOpen(true)}>
        <Trash2 />
        <Trans>Delete ticket</Trans>
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Delete {refLabel}?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                This removes the ticket, its comments and its history. It can't be undone.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void remove()}>
              <Trans>Delete</Trans>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
