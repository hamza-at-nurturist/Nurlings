import { useLingui } from "@lingui/react/macro";
import { brand } from "@nurlings/brand";
import type { NestMood } from "@rakazo/contracts";
import { cn } from "@rakazo/ui-web";
import { useId } from "react";
import { IconTooltip } from "../IconTooltip";
import "./eyes-badge.css";

// The orb is a disc with the two eyes cut out of it; the eyes are the sub-paths after the disc.
const EYES = brand.mark.orb
  .split("Z")
  .map((part) => part.trim())
  .filter(Boolean)
  .slice(1)
  .map((part) => `${part}Z`);

const MOOD_COLOR: Record<NestMood, string> = {
  working: "",
  idle: "text-foreground",
  sleeping: "text-muted-foreground",
  needs_you: "text-warning",
  error: "text-destructive",
};

export function useMoodLabels(): Record<NestMood, string> {
  const { t } = useLingui();
  return {
    working: t`Working`,
    idle: t`Idle`,
    sleeping: t`Sleeping`,
    needs_you: t`Needs you`,
    error: t`Error`,
  };
}

/** Status only: it sits next to the Nurling's avatar and never replaces it. */
export function EyesBadge({ mood, className }: { mood: NestMood; className?: string }) {
  const gradientId = `${useId()}-eyes`;
  const label = useMoodLabels()[mood];
  const [start, middle, end] = brand.colors.orbGradient;
  return (
    <IconTooltip label={label}>
      <span
        role="img"
        aria-label={label}
        data-mood={mood}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full bg-background shadow-xs ring-1 ring-border",
          MOOD_COLOR[mood],
          className,
        )}
      >
        <svg
          viewBox="1455 770 165 118"
          className="h-3.5 w-auto overflow-visible"
          aria-hidden="true"
        >
          {mood === "working" ? (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={start} />
                <stop offset="0.5" stopColor={middle} />
                <stop offset="1" stopColor={end} />
              </linearGradient>
            </defs>
          ) : null}
          <g
            className="nest-eyes"
            data-mood={mood}
            fill={mood === "working" ? `url(#${gradientId})` : "currentColor"}
          >
            {EYES.map((d) => (
              <path key={d} className="nest-eye" d={d} />
            ))}
          </g>
        </svg>
      </span>
    </IconTooltip>
  );
}
