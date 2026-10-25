import { Trans } from "@lingui/react/macro";
import { brand } from "@nurlings/brand";
import type { Bot } from "@rakazo/contracts";
import { BotAvatar, cn, ToggleGroup, ToggleGroupItem } from "@rakazo/ui-web";

const ALL = "all";
const ITEM = "h-8 shrink-0 rounded-full aria-pressed:bg-accent";

type Props = {
  bots: Bot[];
  /** The Nurling the board shows, or null for everyone. */
  value: string | null;
  onChange: (botId: string | null) => void;
  className?: string;
};

/** All, then one avatar per Nurling: the board shows the picked one's tickets. */
export function NurlingFilter({ bots, value, onChange, className }: Props) {
  const nouns = brand.bot.plural;
  return (
    <ToggleGroup
      aria-label={nouns}
      data-testid="board-filter"
      value={[value ?? ALL]}
      // Picking the pressed one again would leave nothing picked; keep the current choice.
      onValueChange={([next]) => {
        if (next) onChange(next === ALL ? null : next);
      }}
      spacing={1}
      className={cn("max-w-full overflow-x-auto [scrollbar-width:none]", className)}
    >
      <ToggleGroupItem
        value={ALL}
        className={cn(ITEM, "px-3 aria-pressed:bg-primary aria-pressed:text-primary-foreground")}
      >
        <Trans>All</Trans>
      </ToggleGroupItem>
      {bots.map((bot) => (
        <ToggleGroupItem
          key={bot.id}
          value={bot.id}
          aria-label={bot.name}
          title={bot.name}
          className={cn(ITEM, "w-9 px-0")}
        >
          <BotAvatar color={bot.color} identity={bot.id} status={bot.status} size={22} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
