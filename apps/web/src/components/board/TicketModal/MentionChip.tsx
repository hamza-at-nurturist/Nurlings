import { useLingui } from "@lingui/react/macro";
import { mentionColor } from "@rakazo/core/nurlings-board";
import { X } from "lucide-react";

type Props = { name: string; color?: string; onRemove?: () => void };

/**
 * A name chip. A Nurling's own hex color tints it and colors the name; a user, or a Nurling whose
 * color is not a hex value, gets the neutral chip. The color comes from data, not a token.
 */
export function MentionChip({ name, color, onRemove }: Props) {
  const { t } = useLingui();
  const hex = mentionColor(color);
  // Same wording and placeholder as the chat composer's chip, so its translations apply.
  const mention = { name };
  return (
    <span
      data-testid="mention-chip"
      data-mention-color={hex ?? ""}
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 align-baseline text-[13px] leading-5 ${hex ? "" : "bg-accent text-foreground"}`}
      style={
        hex
          ? { color: hex, backgroundColor: `color-mix(in srgb, ${hex} 16%, transparent)` }
          : undefined
      }
    >
      <span dir="auto" className="truncate">
        {name}
      </span>
      {onRemove ? (
        <button
          type="button"
          aria-label={t`Remove mention ${mention.name}`}
          onClick={onRemove}
          className="opacity-70 hover:opacity-100"
        >
          <X size={12} strokeWidth={2} />
        </button>
      ) : null}
    </span>
  );
}
