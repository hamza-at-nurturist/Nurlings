import { brand } from "@nurlings/brand";
import type { BotAvatarSet } from "@rakazo/contracts";
import { BOT_AVATAR_SHAPE_COUNT } from "@rakazo/contracts";
import type { BotColorDef, LogoAvatarActivity } from "@rakazo/core";
import {
  BOT_AVATAR_COLORS,
  BOT_COLOR_LIST,
  BRAND_BLOB_SHAPE_INDEX,
  DEFAULT_BOT_AVATAR_COLOR,
  isRunWaitingOnUser,
  isRunWorking,
  organicBotAvatarFrame,
  resolvePersonaColorDef,
  SHIPPED_BOT_AVATAR_SHAPE_KEYS,
  SHIPPED_BOT_AVATAR_SHAPES,
} from "@rakazo/core";
import type { ComponentProps } from "react";
import { memo, useMemo } from "react";
import {
  useBotAvatarActivity,
  useBotAvatarLive,
  useBotAvatarStateNames,
} from "./bot-avatar-activity.js";
import { BrandMark } from "./brand-mark.js";
import { cn } from "./lib/utils.js";
import { LogoAvatar } from "./logo-avatar.js";
import { OrganicAvatar } from "./organic-avatar.js";
import "./styles.css";

export type { BotColorDef };
export { BOT_AVATAR_COLORS, BOT_COLOR_LIST, DEFAULT_BOT_AVATAR_COLOR, resolvePersonaColorDef };

export const BOT_SHAPES = SHIPPED_BOT_AVATAR_SHAPES;
export const SHIPPED_SHAPE_KEYS = SHIPPED_BOT_AVATAR_SHAPE_KEYS;

export const BOT_MASCOT_SHAPES = SHIPPED_SHAPE_KEYS.map(
  (k) => BOT_SHAPES[k] ?? FALLBACK_SHAPE_PATH,
);

const FALLBACK_SHAPE_PATH = BOT_SHAPES.hex ?? "";

export function parseBotAvatar(
  rawColor: string,
  _identity?: string,
): {
  color: string;
  shapeIndex?: number;
  isImage: boolean;
  imageUrl?: string;
} {
  if (!rawColor) return { color: "#F97316", isImage: false };
  // Only data: image URLs are rendered. Arbitrary http(s)/blob values in `color`
  // must not become <img src> (SSRF / tracking when other members view the bot).
  if (rawColor.startsWith("data:image/")) {
    return { color: "#F97316", isImage: true, imageUrl: rawColor };
  }
  if (rawColor.includes("::shape_")) {
    const parts = rawColor.split("::shape_");
    const rawShapeIdx = parts[1] ?? "0";
    const parsedShapeIdx = /^\d+$/.test(rawShapeIdx) ? Number(rawShapeIdx) : 0;
    const shapeIdx = Number.isSafeInteger(parsedShapeIdx) ? parsedShapeIdx : 0;
    return {
      color: parts[0] || "#F97316",
      shapeIndex: shapeIdx % BOT_AVATAR_SHAPE_COUNT,
      isImage: false,
    };
  }
  return { color: rawColor, isImage: false };
}

const AVATAR_HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function defaultBotAvatarValue(rawColor: string): string {
  const parsed = parseBotAvatar(rawColor);
  if (rawColor && !parsed.isImage && AVATAR_HEX.test(parsed.color)) return parsed.color;
  return DEFAULT_BOT_AVATAR_COLOR;
}

export interface BotAvatarProps {
  color: string;
  avatarSet?: BotAvatarSet;
  activity?: LogoAvatarActivity;
  size?: number;
  status?: string;
  identity?: string;
  /** The Nurling's name. With it the avatar is named "{name}, {state}"; without it it is decorative. */
  name?: string;
  /** The status of the ticket this avatar stands for, on views that show one. */
  ticketStatus?: string;
  /** The Nurling's computer is asleep. */
  asleep?: boolean;
  /** Real progress of the run, 0 to 1, when known. The ring shows only then. */
  progress?: number | null;
  className?: string;
}

export const BotAvatar = memo(function BotAvatar({
  color,
  avatarSet,
  activity,
  size = 36,
  status,
  identity = "",
  name,
  ticketStatus,
  asleep,
  progress,
  className,
}: BotAvatarProps) {
  const isWorking = isRunWorking(status) || isRunWaitingOnUser(status);

  const parsed = useMemo(() => parseBotAvatar(color, identity), [color, identity]);
  const effectiveId = identity || parsed.color || "agent";

  const colorDef = useMemo(
    () => resolvePersonaColorDef(effectiveId, parsed.color),
    [effectiveId, parsed.color],
  );

  if (parsed.isImage && parsed.imageUrl) {
    return (
      <div
        className={cn("rakazo-bot-avatar relative shrink-0 select-none", className)}
        data-working={isWorking}
        style={{ width: size, height: size }}
      >
        <div className="rakazo-bot-avatar-picture relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
          <img src={parsed.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
        {isWorking ? (
          <svg
            className="rakazo-bot-avatar-ring rakazo-bot-avatar-ring-working absolute pointer-events-none"
            style={{
              inset: -4,
              width: size + 8,
              height: size + 8,
            }}
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              className="stroke-status-working"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray="45 80"
            />
          </svg>
        ) : null}
      </div>
    );
  }

  if (parsed.shapeIndex === undefined && avatarSet === "rakazo") {
    const Avatar = activity === undefined ? LiveLogoAvatar : LogoAvatar;
    return (
      <Avatar
        avatarValue={color ? colorDef.hex : undefined}
        identity={effectiveId}
        size={size}
        activity={activity}
        status={status}
        className={className}
      />
    );
  }
  // Shapes 9 to 11 and the brand blob (8) draw their own body and eyes; any other shape draws the
  // organic body the bot's id picks, in the stored colour.
  const frame =
    parsed.shapeIndex === undefined ? undefined : organicBotAvatarFrame(parsed.shapeIndex);
  return (
    <LiveOrganicAvatar
      color={colorDef.hex}
      identity={effectiveId}
      size={size}
      status={status}
      ticketStatus={ticketStatus}
      asleep={asleep}
      progress={progress}
      active={isWorking}
      frame={frame}
      reach={parsed.shapeIndex === BRAND_BLOB_SHAPE_INDEX ? 0.55 : 1}
      name={name}
      className={className}
    />
  );
});

/** An organic avatar that listens for its busy run's tool and reply writing only while that run is active. */
function LiveOrganicAvatar({
  active,
  identity,
  ...props
}: ComponentProps<typeof OrganicAvatar> & { active: boolean; identity: string }) {
  const live = useBotAvatarLive(identity, active);
  const stateNames = useBotAvatarStateNames();
  return (
    <OrganicAvatar
      {...props}
      identity={identity}
      tool={live.tool}
      composing={live.composing}
      stateNames={stateNames}
    />
  );
}

/** Only live Rakazo consumers subscribe to public activity updates. */
function LiveLogoAvatar({
  status,
  ...props
}: ComponentProps<typeof LogoAvatar> & { status?: string }) {
  const activity = useBotAvatarActivity(props.identity ?? "", status);
  return <LogoAvatar {...props} activity={activity} />;
}

export function BotShapePreview({
  identity,
  label,
  color,
  selected,
  onClick,
}: {
  /** The organic body this identity draws; with a `::shape_N` color, that shape's own body. */
  identity?: string;
  label: string;
  color: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected ?? false}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        selected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-popover bg-white/10"
          : "hover:bg-white/5",
      )}
    >
      <BotAvatar color={color} identity={identity} size={32} />
    </button>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: brand.colors.iconBackground, color: brand.colors.blob }}
      >
        <BrandMark className="h-5" />
      </div>
      <span
        className="text-[28px] text-foreground"
        style={{
          fontFamily: `${brand.wordmarkFont.family}, ${brand.wordmarkFont.fallback}`,
          fontWeight: brand.wordmarkFont.weight,
          letterSpacing: brand.wordmarkFont.letterSpacing,
        }}
      >
        {brand.name}
      </span>
    </div>
  );
}
