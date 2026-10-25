import { Trans, useLingui } from "@lingui/react/macro";
import { TICKET_DESCRIPTION_MAX_LENGTH } from "@rakazo/contracts";
import { Textarea } from "@rakazo/ui-web";
import { useLayoutEffect, useRef, useState } from "react";

type Props = {
  value: string;
  /** The editor's classes, shared with the wide modal. */
  fieldClassName: string;
  onSave: (next: string) => void;
};

/**
 * The narrow sheet's description: three lines, "Show more" when there is more, and the same
 * editor as the wide modal once tapped. An empty description is the editor straight away.
 */
export function ClampedDescription({ value, fieldClassName, onSave }: Props) {
  const { t } = useLingui();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const text = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const element = text.current;
    if (!element) return;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, editing, expanded]);

  if (editing || !value)
    return (
      <Textarea
        aria-label={t`Description`}
        data-testid="ticket-description"
        defaultValue={value}
        autoFocus={editing}
        maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
        className={`${fieldClassName} min-h-20 py-1.5 text-base`}
        onBlur={(event) => {
          setEditing(false);
          if (event.currentTarget.value !== value) onSave(event.currentTarget.value);
        }}
      />
    );
  return (
    <div className="space-y-1">
      <button
        ref={text}
        type="button"
        data-testid="ticket-description-text"
        className={`block w-full text-left text-[15px] leading-relaxed break-words whitespace-pre-wrap outline-none focus-visible:ring-2 focus-visible:ring-ring ${expanded ? "" : "line-clamp-3"}`}
        onClick={() => setEditing(true)}
      >
        {value}
      </button>
      {overflows && !expanded ? (
        <button
          type="button"
          className="min-h-11 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(true)}
        >
          <Trans>Show more</Trans>
        </button>
      ) : null}
    </div>
  );
}
