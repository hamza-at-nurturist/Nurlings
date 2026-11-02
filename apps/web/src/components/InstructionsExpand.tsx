import { Trans, useLingui } from "@lingui/react/macro";
import { BOT_INSTRUCTIONS_MAX_LENGTH } from "@rakazo/contracts";
import { Button, Textarea } from "@rakazo/ui-web";
import { Dialog, DialogContent, DialogTitle } from "@rakazo/ui-web/components/ui/dialog";
import { Maximize2 } from "lucide-react";
import { useState } from "react";

/** Opens a bot's instructions in a large editor; `onClose` is where the caller saves. */
export function InstructionsExpand({
  value,
  disabled,
  onChange,
  onClose,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t`Expand instructions`}
        title={t`Expand instructions`}
        onClick={() => setOpen(true)}
      >
        <Maximize2 className="size-4 text-muted-foreground" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onClose();
        }}
      >
        <DialogContent className="flex h-[85vh] flex-col sm:max-w-3xl">
          <DialogTitle>
            <Trans>Instructions</Trans>
          </DialogTitle>
          <Textarea
            aria-label={t`Instructions`}
            className="min-h-0 flex-1 resize-none rounded-xl border-transparent bg-muted/50 p-4 font-normal text-foreground shadow-none"
            value={value}
            maxLength={BOT_INSTRUCTIONS_MAX_LENGTH}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
