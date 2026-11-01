import { brand } from "@nurlings/brand";
import type { BotAvatarSet } from "@rakazo/contracts";
import { BOT_AVATAR_SHAPE_COUNT } from "@rakazo/contracts";
import type { BotColorDef, LogoAvatarActivity } from "@rakazo/core";
import {
  ACTIVE_RUN_STATUSES,
  avatarIdentitySeed,
  BOT_AVATAR_COLORS,
  BOT_COLOR_LIST,
  DEFAULT_BOT_AVATAR_COLOR,
  type OrganicBotAvatarFrame,
  organicAvatarPath,
  organicBotAvatarFrame,
  resolvePersonaColorDef,
  SHIPPED_BOT_AVATAR_SHAPE_KEYS,
  SHIPPED_BOT_AVATAR_SHAPES,
  type shippedBotAvatarEyes,
} from "@rakazo/core";
import { tokens } from "@rakazo/ui-tokens";
import type { ComponentProps, CSSProperties } from "react";
import { memo, useEffect, useMemo, useSyncExternalStore } from "react";
import { useBotAvatarActivity } from "./bot-avatar-activity.js";
import { BrandMark } from "./brand-mark.js";
import { useAvatarMotionVisibility } from "./hooks/use-avatar-motion-visibility.js";
import { cn } from "./lib/utils.js";
import { LogoAvatar } from "./logo-avatar.js";
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
  className?: string;
}

export const BotAvatar = memo(function BotAvatar({
  color,
  avatarSet,
  activity,
  size = 36,
  status,
  identity = "",
  className,
}: BotAvatarProps) {
  const isWorking = ACTIVE_RUN_STATUSES.some((s) => s === status);

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
    <OrganicAvatar
      color={colorDef.hex}
      identity={effectiveId}
      size={size}
      isWorking={isWorking}
      frame={frame}
      className={className}
    />
  );
});

/** The two eyes of a shape: ellipses, or tilted pills for the brand blob. */
function ShapeEyes({
  eyes,
  fill,
  className,
}: {
  eyes: ReturnType<typeof shippedBotAvatarEyes>;
  fill?: string;
  className?: string;
}) {
  return (
    <g fill={fill} className={className}>
      {[eyes.left, eyes.right].map(({ cx, cy }) =>
        eyes.kind === "pill" ? (
          <rect
            key={cx}
            x={cx - eyes.rx}
            y={cy - eyes.ry}
            width={eyes.rx * 2}
            height={eyes.ry * 2}
            rx={eyes.rx}
            transform={`rotate(${eyes.tiltDeg} ${cx} ${cy})`}
          />
        ) : (
          <ellipse key={cx} cx={cx} cy={cy} rx={eyes.rx} ry={eyes.ry} />
        ),
      )}
    </g>
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

function OrganicAvatar({
  color,
  identity,
  size,
  isWorking,
  frame,
  className,
}: {
  color: string;
  identity?: string;
  size: number;
  isWorking: boolean;
  /** A fixed body and eyes to draw instead of the seeded organic ones. */
  frame?: OrganicBotAvatarFrame;
  className?: string;
}) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
  const { ref, visible } = useAvatarMotionVisibility(!reducedMotion);
  useEffect(() => {
    // jsdom has no SMIL clock, so these are optional.
    if (visible) ref.current?.unpauseAnimations?.();
    else ref.current?.pauseAnimations?.();
  }, [ref, visible]);
  const seed = avatarIdentitySeed(identity || color || DEFAULT_BOT_AVATAR_COLOR);
  const duration = `${4.8 + (seed % 24) / 10}s`;
  const shapeA = frame?.path ?? organicAvatarPath(seed);
  const shapeB = frame ? shapeA : organicAvatarPath(seed, 0.42);

  return (
    <svg
      ref={ref}
      viewBox="-60 -60 120 120"
      aria-hidden="true"
      className={cn("rakazo-organic-avatar overflow-visible select-none", className)}
      data-working={isWorking}
      data-paused={!visible}
      data-shape-family={seed % 10}
      data-eye-pattern={seed % 4}
      style={{
        width: size,
        height: size,
        flex: "none",
      }}
    >
      {(["idle", "working"] as const).map((mode) => (
        <path
          key={mode}
          className={`rakazo-organic-avatar-body rakazo-organic-avatar-body-${mode}`}
          d={shapeA}
          fill={color}
          style={
            {
              "--rakazo-organic-path": `path("${shapeA}")`,
              filter:
                mode === "working"
                  ? `drop-shadow(0 0 ${Math.round(size * 0.16)}px ${color})`
                  : "drop-shadow(0 2px 3px rgba(0,0,0,.34))",
            } as CSSProperties
          }
        >
          {/* Only a working body morphs. A late <animate> joins the svg clock mid-loop. */}
          {!reducedMotion && !frame && mode === "working" && isWorking ? (
            <animate
              attributeName="d"
              values={`${shapeA};${shapeB};${shapeA}`}
              dur={duration}
              repeatCount="indefinite"
            />
          ) : null}
        </path>
      ))}
      <g transform={frame ? undefined : `rotate(${(seed % 9) - 4})`}>
        {(["idle", "working"] as const).map((mode) => (
          <g
            key={mode}
            className={`rakazo-organic-avatar-eyes rakazo-organic-avatar-eyes-${mode}`}
            fill={tokens.background}
            // Off-centre eyes blink about their own centre.
            style={frame ? { transformBox: "fill-box", transformOrigin: "center" } : undefined}
          >
            {frame ? (
              <ShapeEyes eyes={frame.eyes} />
            ) : (
              <>
                <rect x="-14" y="-12" width="7" height="24" rx="3.5" />
                <rect x="7" y="-12" width="7" height="24" rx="3.5" />
              </>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

const reducedMotionMedia = "(prefers-reduced-motion: reduce)";

function reducedMotionSnapshot(): boolean {
  return window.matchMedia(reducedMotionMedia).matches;
}

function subscribeToReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia(reducedMotionMedia);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
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
