import type { BotAvatarSet } from "@rakazo/contracts";
import type {
  AvatarMotionMode,
  AvatarState,
  LogoAvatarActivity,
  OrganicBotAvatarFrame,
} from "@rakazo/core";
import {
  AVATAR_LID_CLOSE,
  AVATAR_MOTION_UNITS,
  AVATAR_STILL_MAX_SIZE,
  avatarClip,
  avatarClock,
  avatarFrame,
  avatarGlossPath,
  avatarIdentitySeed,
  avatarJellyFrame,
  avatarMotionState,
  avatarPokeFrame,
  avatarPropAnchors,
  avatarRestingBlink,
  avatarSchedulePose,
  avatarWorkingDot,
  botAvatarActivity,
  isLightAvatarColor,
  isRunWaitingOnUser,
  isRunWorking,
  organicAvatarPath,
  organicBotAvatarFrame,
  svgPathBounds,
  usesLogoAvatar,
} from "@rakazo/core";
import { useAvatarState, useToolSwap } from "@rakazo/core/avatar-state-react";
import { botEyeColor } from "@rakazo/ui-tokens";
import { AVATAR_DEPTH, AVATAR_ILLUSTRATION } from "@rakazo/ui-tokens/avatar-illustration";
import { memo, useEffect, useId, useMemo, useRef, useSyncExternalStore } from "react";
import { Image, Pressable, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import type { AvatarLife } from "../lib/avatar-life";
import { playPoke, useAvatarOnScreen, useLife, usePoke, useSettling } from "../lib/avatar-life";
import { mobileBotAvatarPresentation } from "../lib/bot-avatar";
import { useI18n } from "../lib/i18n";
import { mobileLogoAvatarActivity } from "../lib/logo-avatar-activity";
import { useMobileTokens } from "../lib/native";
import { dullBody, lidCap, organicAvatarView, TOOL_GAZE } from "../lib/organic-avatar-view";
import { AvatarPip } from "./avatar-pip";
import {
  OrbitDot,
  ProgressRing,
  Ripples,
  SleepZs,
  SweatDrop,
  ThinkingDots as ThinkingPulse,
  ToolSlot,
} from "./avatar-props";
import { LogoAvatar } from "./logo-avatar";
import { NativeSymbol } from "./native-symbol";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/** The avatar's flat frame right now, a tap poke included; a worklet. */
function liveFrame(life: AvatarLife) {
  "worklet";
  const now = life.seconds.value;
  const segments = life.schedule.value;
  const pose = avatarSchedulePose(segments, now);
  const frame = avatarFrame(pose, life.awake.value);
  if (life.awake.value < 1) {
    // Resting and Reduce Motion blinks: the authored blink times, with the resting blink.
    let shut = 0;
    for (const segment of segments) {
      if (!segment.clip || segment.start > now) continue;
      const clip = avatarClip(segment.clip);
      for (const blink of clip.blinks ?? [])
        shut = Math.max(shut, avatarRestingBlink(now - segment.start - blink));
    }
    frame.lid = Math.min(frame.lid, 1 - AVATAR_LID_CLOSE * shut);
  }
  // The eyes settle on a shown prop and the lids stay heavy while asleep, blocked or worn out.
  frame.eyeX += life.gazeX.value;
  frame.eyeY += life.gazeY.value;
  frame.lid = Math.min(frame.lid, life.lidCap.value);
  const poke = life.poke.value;
  if (poke) {
    const extra = avatarPokeFrame(poke, life.pokeProgress.value);
    frame.rotate += extra.rotate;
    frame.translateY += extra.translateY;
    frame.scaleY *= extra.scaleY;
    frame.eyeY += extra.eyeY;
    // Every poke carries the jelly squash, pivoting at the bottom.
    const jelly = avatarJellyFrame(life.pokeProgress.value);
    frame.scaleX *= jelly.scaleX;
    frame.scaleY *= jelly.scaleY;
    frame.translateY += jelly.translateY;
  }
  return frame;
}

/** The body transform for an avatar `size` points wide. */
function useBodyStyle(life: AvatarLife, size: number) {
  return useAnimatedStyle(() => {
    const frame = liveFrame(life);
    return {
      transform: [
        { translateX: frame.translateX * size },
        { translateY: frame.translateY * size },
        { rotate: `${frame.rotate}deg` },
        { scaleX: frame.scaleX },
        { scaleY: frame.scaleY },
      ],
    };
  });
}

/** An eye's offset (motion units), its height and whether it shows. */
function eyeState(life: AvatarLife) {
  "worklet";
  const frame = liveFrame(life);
  return { x: frame.eyeX, y: frame.eyeY, lid: frame.lid };
}

export interface BotAvatarProps {
  color: string;
  size?: number;
  status?: string;
  identity?: string;
  avatarSet?: BotAvatarSet;
  activity?: LogoAvatarActivity;
  muted?: boolean;
  motion?: AvatarMotionMode;
  composing?: boolean;
  pokeable?: boolean;
  /** The Nurling's name. With it the avatar is an image named "{name}, {state}" (idle: just the name). */
  name?: string;
  /** The status of the ticket this avatar stands for, on screens that show one. */
  ticketStatus?: string;
  /** The Nurling's computer is asleep. Nothing supplies this yet. */
  asleep?: boolean;
  /** Run progress, 0 to 1. Nothing supplies this yet. */
  progress?: number | null;
}

/** Missing set metadata deliberately preserves every existing avatar. */
export const BotAvatar = memo(function BotAvatar(props: BotAvatarProps) {
  if (usesLogoAvatar(props)) {
    return <RakazoBotAvatar {...props} />;
  }
  return <LegacyBotAvatar {...props} />;
});

function RakazoBotAvatar({
  color,
  identity,
  size = 54,
  status,
  activity,
  composing = false,
  muted = false,
  motion = "static",
  pokeable = false,
}: BotAvatarProps) {
  const liveActivity = useSyncExternalStore(
    mobileLogoAvatarActivity.subscribe,
    () => mobileLogoAvatarActivity.getActivity(identity ?? "", status),
    (): LogoAvatarActivity => "idle",
  );
  const resolved = botAvatarActivity(
    { color, avatarSet: "rakazo" },
    activity ??
      (composing && (liveActivity === "working" || liveActivity === "idle")
        ? "writing"
        : liveActivity),
  );
  const working = isRunWorking(status) && resolved !== "writing" && motion !== "running";
  return (
    <View style={{ width: size, height: size }}>
      <LogoAvatar
        color={color}
        identity={identity}
        size={size}
        activity={resolved}
        motion={motion}
        pokeable={pokeable}
      />
      {working ? <WorkingDot size={size} muted={muted} /> : null}
      {muted ? <MutedBadge size={size} /> : null}
    </View>
  );
}

function WorkingDot({ size, muted }: { size: number; muted: boolean }) {
  const tokens = useMobileTokens();
  const { t } = useI18n();
  const dot = avatarWorkingDot(size);
  return (
    <View
      accessibilityLabel={t("Working")}
      style={{
        position: "absolute",
        right: muted ? undefined : dot.inset - dot.ring,
        left: muted ? dot.inset - dot.ring : undefined,
        bottom: dot.inset - dot.ring,
        width: dot.diameter + dot.ring * 2,
        height: dot.diameter + dot.ring * 2,
        borderRadius: size,
        borderWidth: dot.ring,
        borderColor: tokens.background,
        backgroundColor: tokens.workingDot,
      }}
    />
  );
}

function MutedBadge({ size }: { size: number }) {
  const tokens = useMobileTokens();
  const { t } = useI18n();
  return (
    <View
      accessible
      accessibilityLabel={t("Notifications silenced")}
      style={{
        position: "absolute",
        right: -2,
        bottom: -2,
        width: Math.max(14, Math.round(size * 0.34)),
        height: Math.max(14, Math.round(size * 0.34)),
        borderRadius: size,
        borderWidth: 2,
        borderColor: tokens.background,
        // Opaque under the translucent fill, so the avatar does not show through the bell.
        backgroundColor: tokens.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          borderRadius: size,
          backgroundColor: tokens.secondary,
        }}
      />
      <NativeSymbol
        ios="bell.slash.fill"
        android="notifications-off"
        size={Math.max(8, Math.round(size * 0.17))}
        color={tokens.foreground}
      />
    </View>
  );
}

/** The live tool and reply-writing flag of a busy run; empty for a resting avatar, with no subscription. */
function useLiveAvatar(identity: string | undefined, enabled: boolean) {
  const subscribe = (listener: () => void) =>
    enabled ? mobileLogoAvatarActivity.subscribe(listener) : () => undefined;
  return useSyncExternalStore(
    subscribe,
    () => (enabled ? mobileLogoAvatarActivity.getLive(identity ?? "") : NO_LIVE),
    () => NO_LIVE,
  );
}
const NO_LIVE = { tool: "none", composing: false } as const;

/** The spoken name: the Nurling's name, then its state; an idle avatar is just the name. */
function useAvatarLabel(name: string | undefined, state: AvatarState): string | undefined {
  const { t } = useI18n();
  if (!name) return undefined;
  const spoken: Record<AvatarState, string | undefined> = {
    idle: undefined,
    thinking: t("thinking"),
    working: t("Working").toLowerCase(),
    needs: t("needs you"),
    review: t("in review"),
    blocked: t("blocked"),
    done: t("done"),
    asleep: t("asleep"),
  };
  const word = spoken[state];
  return word ? `${name}, ${word}` : name;
}

function LegacyBotAvatar({
  color,
  size = 54,
  status,
  identity,
  muted = false,
  motion = "static",
  composing = false,
  pokeable = false,
  name,
  ticketStatus,
  asleep,
  progress,
}: BotAvatarProps) {
  const tokens = useMobileTokens();
  const live = useLiveAvatar(identity, isRunWorking(status) || isRunWaitingOnUser(status));
  const { state: avatarStateValue, working } = useAvatarState({
    status,
    composing: composing || live.composing,
    tool: live.tool,
    ticketStatus,
    asleep,
    progress,
  });
  const state = avatarMotionState(avatarStateValue);
  const parsed = mobileBotAvatarPresentation(color);
  const isImage = parsed.kind === "image";
  // The working dot marks a photo's run; organic avatars show their state instead, and a
  // running avatar is itself that sign.
  const isWorking = isImage && isRunWorking(status) && !composing && motion !== "running";
  const onScreen = useAvatarOnScreen();
  const reducedMotion = useReducedMotion();
  const settling = useSettling(state);
  const clock = avatarClock({
    mode: motion,
    onScreen,
    hasEyes: !isImage,
    size,
    state,
    settling,
    reducedMotion,
  });
  const propTool = avatarStateValue === "working" ? working.tool : "none";
  // A still avatar (24 pt and smaller, Reduce Motion, off screen) switches props at once.
  const moving = clock === "running" && !reducedMotion && size > AVATAR_STILL_MAX_SIZE;
  const swap = useToolSwap(propTool, moving);
  const view = organicAvatarView({
    state: avatarStateValue,
    working,
    shownTool: swap.shown,
    clock,
    size,
    reducedMotion,
  });
  const life = useLife(state, clock, size, motion);
  const poke = usePoke(life, pokeable && clock === "running");
  // A tool swap plays the jelly squash on its own, on a moving avatar only.
  const shownTool = useRef(swap.shown);
  useEffect(() => {
    if (shownTool.current === swap.shown) return;
    shownTool.current = swap.shown;
    if (moving) playPoke(life, "jelly");
  }, [swap.shown, moving, life]);
  const bodyStyle = useBodyStyle(life, size);
  const gaze = TOOL_GAZE[view.tool];
  const cap = lidCap(view);
  // The eyes blink as the old prop drops.
  useEffect(() => {
    if (swap.phase !== "out") return;
    life.lidCap.value = withTiming(0.08, { duration: 100 });
    const timer = setTimeout(() => {
      life.lidCap.value = withTiming(cap, { duration: 140 });
    }, 110);
    return () => clearTimeout(timer);
  }, [swap.phase, life, cap]);
  useEffect(() => {
    life.gazeX.value = withTiming(gaze.x, { duration: 300 });
    life.gazeY.value = withTiming(gaze.y, { duration: 300 });
    life.lidCap.value = withTiming(cap, { duration: 300 });
  }, [life, gaze.x, gaze.y, cap]);
  // The brand blob and the original bodies (shapes 8 to 11) draw their own body and eyes; every
  // other shape draws the organic body the bot's id picks.
  const blobFrame = parsed.kind === "shape" ? organicBotAvatarFrame(parsed.shapeIndex) : undefined;
  const fillColor = parsed.kind === "shape" || parsed.kind === "color" ? parsed.color : color;
  const seed = avatarIdentitySeed(identity || fillColor || "#8B5CF6");
  const path = blobFrame?.path ?? organicAvatarPath(seed);
  const anchors = useMemo(() => avatarPropAnchors(svgPathBounds(path)), [path]);
  const bodyColor = view.dull ? dullBody(fillColor, AVATAR_ILLUSTRATION.dull) : fillColor;
  const label = useAvatarLabel(name, avatarStateValue);
  const picture = isImage ? (
    parsed.imageUrl ? (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          // A plain circle holds the photo's place while it loads, or if it fails to.
          backgroundColor: tokens.secondary,
        }}
      >
        <Image source={{ uri: parsed.imageUrl }} style={{ width: size, height: size }} />
      </View>
    ) : null
  ) : (
    <OrganicAvatar
      color={bodyColor}
      glintTone={blobFrame?.glint ?? (isLightAvatarColor(fillColor) ? "light" : undefined)}
      path={path}
      gloss={blobFrame?.gloss ?? avatarGlossPath(path)}
      seed={seed}
      size={size}
      life={life}
      bodyStyle={bodyStyle}
      frame={blobFrame}
      blush={
        (avatarStateValue === "done" || avatarStateValue === "asleep") &&
        size > AVATAR_STILL_MAX_SIZE
      }
    />
  );
  const avatar = (
    <View
      style={{ width: size, height: size }}
      accessible={label ? true : undefined}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
    >
      {view.look === "ripple" ? <Ripples color={fillColor} size={size} /> : null}
      {view.look === "ring" ? (
        <ProgressRing color={fillColor} size={size} progress={progress ?? 0} />
      ) : null}
      {view.look === "orbit" ? <OrbitDot color={fillColor} size={size} /> : null}
      {picture}
      {view.look === "tool" ? (
        <ToolSlot tool={view.tool} phase={swap.phase} anchors={anchors} size={size} />
      ) : null}
      {view.long ? <SweatDrop size={size} /> : null}
      {view.animated && avatarStateValue === "thinking" ? (
        <ThinkingPulse color={fillColor} size={size} />
      ) : null}
      {view.animated && view.asleep ? <SleepZs color={fillColor} size={size} /> : null}
      {view.pip ? <AvatarPip pip={view.pip} size={size} /> : null}
      {isWorking ? <WorkingDot size={size} muted={muted} /> : null}
      {muted ? <MutedBadge size={size} /> : null}
    </View>
  );
  // A tap is a little toy, not an action, so it stays out of the accessibility tree.
  return pokeable ? (
    <Pressable accessible={false} onPress={poke}>
      {avatar}
    </Pressable>
  ) : (
    avatar
  );
}

type BodyStyle = ReturnType<typeof useAnimatedStyle>;

/** An organic avatar's upright eyes in its 120-unit box. */
const ORGANIC_EYES: ShapeEyes = {
  kind: "pill",
  left: { cx: -10.5, cy: 0 },
  right: { cx: 10.5, cy: 0 },
  rx: 3.5,
  ry: 12,
  tiltDeg: 0,
};

type ShapeEyes = OrganicBotAvatarFrame["eyes"];

/** The eye glint: white, darker on a light body, ink on an ink one. */
function glintColors(
  tone: "ink" | "light" | undefined,
  tokens: { background: string; foreground: string },
) {
  if (tone === "ink")
    return { catchlight: tokens.foreground, gloss: tokens.background, opacity: 0.16 };
  if (tone === "light")
    return { catchlight: tokens.foreground, gloss: AVATAR_ILLUSTRATION.glintOnLight, opacity: 0.4 };
  return { catchlight: AVATAR_ILLUSTRATION.white, gloss: AVATAR_ILLUSTRATION.white, opacity: 0.5 };
}

/** Pill eyes are tilted about their own centre; blinking closes them along their length. */
function PillEyes({
  eyes,
  life,
  units,
  catchlight,
}: {
  eyes: ShapeEyes;
  life: AvatarLife;
  /** The width of the box the eyes are drawn in. */
  units: number;
  catchlight: string;
}) {
  const eyeProps = (cx: number, cy: number) => () => {
    "worklet";
    const state = eyeState(life);
    const scale = units / AVATAR_MOTION_UNITS;
    const height = eyes.ry * 2 * state.lid;
    return {
      x: cx - eyes.rx + state.x * scale,
      y: cy - height / 2 + state.y * scale,
      height,
    };
  };
  const catchProps = (cx: number, cy: number) => () => {
    "worklet";
    const state = eyeState(life);
    const scale = units / AVATAR_MOTION_UNITS;
    return {
      cx: cx - eyes.rx * 0.25 + state.x * scale,
      cy: cy - eyes.ry * 0.45 * state.lid + state.y * scale,
      opacity: state.lid > 0.6 ? 1 : 0,
    };
  };
  const leftEye = useAnimatedProps(eyeProps(eyes.left.cx, eyes.left.cy));
  const rightEye = useAnimatedProps(eyeProps(eyes.right.cx, eyes.right.cy));
  const leftCatch = useAnimatedProps(catchProps(eyes.left.cx, eyes.left.cy));
  const rightCatch = useAnimatedProps(catchProps(eyes.right.cx, eyes.right.cy));
  const radius = Math.max(1.4, eyes.rx * 0.55);
  return (
    <>
      <AnimatedRect
        animatedProps={leftEye}
        width={eyes.rx * 2}
        rx={eyes.rx}
        fill={botEyeColor}
        transform={`rotate(${eyes.tiltDeg} ${eyes.left.cx} ${eyes.left.cy})`}
      />
      <AnimatedRect
        animatedProps={rightEye}
        width={eyes.rx * 2}
        rx={eyes.rx}
        fill={botEyeColor}
        transform={`rotate(${eyes.tiltDeg} ${eyes.right.cx} ${eyes.right.cy})`}
      />
      <AnimatedCircle animatedProps={leftCatch} r={radius} fill={catchlight} />
      <AnimatedCircle animatedProps={rightCatch} r={radius} fill={catchlight} />
    </>
  );
}

/** The two cheeks, drifting with the eyes. */
function Blush({ life, units }: { life: AvatarLife; units: number }) {
  const cheek = (cx: number) => () => {
    "worklet";
    const state = eyeState(life);
    const scale = units / AVATAR_MOTION_UNITS;
    return { cx: cx + state.x * scale, cy: 9 + state.y * scale };
  };
  const left = useAnimatedProps(cheek(-23));
  const right = useAnimatedProps(cheek(23));
  return (
    <>
      <AnimatedEllipse
        animatedProps={left}
        rx={5}
        ry={3.2}
        fill={AVATAR_ILLUSTRATION.blush}
        opacity={AVATAR_DEPTH.blushOpacity}
      />
      <AnimatedEllipse
        animatedProps={right}
        rx={5}
        ry={3.2}
        fill={AVATAR_ILLUSTRATION.blush}
        opacity={AVATAR_DEPTH.blushOpacity}
      />
    </>
  );
}

function OrganicAvatar({
  color,
  glintTone,
  path,
  gloss,
  seed,
  size,
  life,
  bodyStyle,
  frame,
  blush,
}: {
  color: string;
  glintTone: "ink" | "light" | undefined;
  path: string;
  gloss: string;
  seed: number;
  size: number;
  life: AvatarLife;
  bodyStyle: BodyStyle;
  /** A fixed body and eyes to draw instead of the seeded organic ones. */
  frame?: OrganicBotAvatarFrame;
  /** A soft blush under the eyes, for a Done or Asleep face. */
  blush: boolean;
}) {
  const tokens = useMobileTokens();
  const glint = glintColors(glintTone, tokens);
  // A clip and a gradient of this avatar's own, so two avatars on one screen never share them.
  const depthId = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
      <Svg width={size} height={size} viewBox="-60 -60 120 120">
        <Defs>
          <ClipPath id={`${depthId}clip`}>
            <Path d={path} />
          </ClipPath>
          <LinearGradient
            id={`${depthId}shade`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={AVATAR_DEPTH.shadeFromY}
            x2="0"
            y2={AVATAR_DEPTH.shadeToY}
          >
            <Stop offset="0" stopColor={AVATAR_ILLUSTRATION.shadow} stopOpacity="0" />
            <Stop offset="0.5" stopColor={AVATAR_ILLUSTRATION.shadow} stopOpacity="0" />
            <Stop
              offset="1"
              stopColor={AVATAR_ILLUSTRATION.shadow}
              stopOpacity={AVATAR_DEPTH.shadeOpacity}
            />
          </LinearGradient>
        </Defs>
        <Path d={path} fill={color} />
        <G clipPath={`url(#${depthId}clip)`}>
          <Path d={path} fill={`url(#${depthId}shade)`} />
          <Path
            d={path}
            transform={`translate(0 ${AVATAR_DEPTH.rimShift})`}
            fill="none"
            stroke={AVATAR_ILLUSTRATION.white}
            strokeOpacity={AVATAR_DEPTH.rimOpacity}
            strokeWidth={AVATAR_DEPTH.rimWidth}
          />
          <Path
            d={path}
            transform={`translate(0 ${-AVATAR_DEPTH.baseShift})`}
            fill="none"
            stroke={AVATAR_ILLUSTRATION.shadow}
            strokeOpacity={AVATAR_DEPTH.baseOpacity}
            strokeWidth={AVATAR_DEPTH.baseWidth}
          />
        </G>
        <Path
          d={gloss}
          fill="none"
          stroke={glint.gloss}
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity={glint.opacity}
        />
        <G transform={frame ? undefined : `rotate(${(seed % 9) - 4})`}>
          <PillEyes
            eyes={frame?.eyes ?? ORGANIC_EYES}
            life={life}
            units={120}
            catchlight={glint.catchlight}
          />
          {blush ? <Blush life={life} units={120} /> : null}
        </G>
      </Svg>
    </Animated.View>
  );
}
