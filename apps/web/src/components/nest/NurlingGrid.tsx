import { useLingui } from "@lingui/react/macro";
import type { NestNurling } from "@rakazo/contracts";
import { BotAvatar } from "@rakazo/ui-web";
import { Link } from "react-router-dom";
import { EyesBadge } from "./EyesBadge";
import type { NestSectionProps } from "./types";
import { nurlingPath } from "./types";

function formatNextTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  return date.toLocaleString(undefined, {
    ...(sameDay ? {} : { weekday: "short" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

function NurlingCard({ nurling }: { nurling: NestNurling }) {
  const { t } = useLingui();
  const next = nurling.nextRoutine;
  const routine = next?.name ?? "";
  const time = next ? formatNextTime(next.at) : "";
  return (
    <Link
      to={nurlingPath(nurling.id, null)}
      className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-center gap-3">
        <span className="relative inline-flex shrink-0">
          <BotAvatar color={nurling.color} identity={nurling.id} size={48} />
          <EyesBadge mood={nurling.mood} className="absolute -right-2 -bottom-1" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{nurling.name}</span>
          {nurling.title ? (
            <span className="block truncate text-sm text-muted-foreground">{nurling.title}</span>
          ) : null}
        </span>
      </div>
      {nurling.currentTask ? (
        <p className="line-clamp-2 text-sm">{nurling.currentTask.text}</p>
      ) : null}
      {next ? (
        <p className="truncate text-sm text-muted-foreground">{t`Next: ${routine} · ${time}`}</p>
      ) : null}
    </Link>
  );
}

export function NurlingGrid({ snapshot }: NestSectionProps) {
  if (snapshot.nurlings.length === 0) return null;
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {snapshot.nurlings.map((nurling) => (
        <NurlingCard key={nurling.id} nurling={nurling} />
      ))}
    </section>
  );
}
