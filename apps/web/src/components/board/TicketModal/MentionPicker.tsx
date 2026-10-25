import type { Bot } from "@rakazo/contracts";
import { MentionOptionIcon } from "../../../pages/shell/composer-mentions";

type Props = {
  id: string;
  options: Bot[];
  highlighted: number;
  onHighlight: (index: number) => void;
  onPick: (bot: Bot) => void;
  /** Where it opens from the box: above, as the reply box needs, or below. */
  side?: "above" | "below";
};

/** The Nurlings matching the `@` being typed, next to the box. */
export function MentionPicker({
  id,
  options,
  highlighted,
  onHighlight,
  onPick,
  side = "above",
}: Props) {
  return (
    <div
      id={id}
      role="listbox"
      data-testid="mention-picker"
      className={`absolute inset-x-0 z-10 max-h-48 ${side === "above" ? "bottom-full mb-1" : "top-full mt-1"} overflow-y-auto rounded-xl bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10`}
    >
      {options.map((bot, index) => (
        <div
          key={bot.id}
          id={`${id}-${bot.id}`}
          role="option"
          tabIndex={-1}
          aria-selected={index === highlighted}
          data-testid="mention-option"
          className={`flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${index === highlighted ? "bg-accent text-accent-foreground" : ""}`}
          onMouseMove={() => onHighlight(index)}
          // Keep the caret in the box: a click must not blur it before the pick lands.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(bot)}
          onKeyDown={() => undefined}
        >
          <MentionOptionIcon
            mention={{ kind: "bot", id: bot.id, name: bot.name, color: bot.color }}
          />
          <span dir="auto" className="min-w-0 truncate">
            {bot.name}
          </span>
        </div>
      ))}
    </div>
  );
}
