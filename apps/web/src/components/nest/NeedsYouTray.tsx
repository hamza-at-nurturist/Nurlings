import { Trans } from "@lingui/react/macro";
import { BotAvatar, buttonVariants } from "@rakazo/ui-web";
import { Link } from "react-router-dom";
import type { NestSectionProps } from "./types";
import { nurlingPath } from "./types";

/** Read-only: it points at the thread, where the ask is answered. Renders nothing when empty. */
export function NeedsYouTray({ snapshot }: NestSectionProps) {
  const bots = new Map(snapshot.nurlings.map((nurling) => [nurling.id, nurling]));
  const items = snapshot.needsYou.filter((item) => bots.has(item.botId));
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="nest-needs-you" className="rounded-xl border bg-card p-4">
      <h2 id="nest-needs-you" className="mb-3 text-sm font-medium">
        <Trans>Needs you</Trans>
      </h2>
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const bot = bots.get(item.botId);
          if (!bot) return null;
          return (
            <li key={`${item.runId}:${item.messageId ?? ""}`} className="flex items-center gap-3">
              <BotAvatar color={bot.color} identity={bot.id} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{bot.name}</span>
                {item.text ? (
                  <span className="block truncate text-sm text-muted-foreground">{item.text}</span>
                ) : null}
              </span>
              <Link
                to={nurlingPath(item.botId, item.groupId)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Trans>Open</Trans>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
