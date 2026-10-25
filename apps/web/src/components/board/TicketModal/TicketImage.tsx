import { useLingui } from "@lingui/react/macro";
import { TICKET_IMAGE_MIME_TYPES } from "@rakazo/core/nurlings-board";
import { Button, Dialog, DialogClose, DialogContent, DialogTitle } from "@rakazo/ui-web";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useArtifactImage } from "../../../lib/use-artifact-image";

/** Image types a browser shows inline, so they get a thumbnail instead of a file card. */
export const THUMBNAIL_MIME_TYPES = new Set(TICKET_IMAGE_MIME_TYPES);

/** A square thumbnail of a ticket image that opens it full screen. Loads once scrolled near. */
export function TicketImage({ file }: { file: { id: string; botId: string; name: string } }) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const container = useRef<HTMLButtonElement>(null);
  const src = useArtifactImage({ botId: file.botId }, file.id, visible);

  useEffect(() => {
    const element = container.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <button
        ref={container}
        type="button"
        aria-label={file.name}
        data-testid="ticket-image"
        disabled={!src}
        onClick={() => setOpen(true)}
        className="flex aspect-square w-full items-end overflow-hidden rounded-xl bg-muted text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {src ? (
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <span className="truncate p-1.5 text-xs text-muted-foreground">{file.name}</span>
        )}
      </button>
      {src ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            showCloseButton={false}
            data-testid="ticket-image-viewer"
            className="top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none bg-background p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ring-0 sm:max-w-none"
          >
            <DialogTitle className="sr-only">{file.name}</DialogTitle>
            <DialogClose
              aria-label={t`Close image`}
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="absolute end-2 top-[max(env(safe-area-inset-top),0.5rem)] size-11"
                />
              }
            >
              <X />
            </DialogClose>
            <img src={src} alt={file.name} className="max-h-full max-w-full object-contain" />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
