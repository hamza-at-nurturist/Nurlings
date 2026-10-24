import { brand } from "@nurlings/brand";
import * as SplashScreen from "expo-splash-screen";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  parseViewBox,
  pathBottomCenter,
  pathCenter,
  subpaths,
} from "../../lib/brand-splash-geometry";
import type { SplashMode, Track } from "../../lib/brand-splash-timeline";
import {
  CHIEF_BLINK,
  CHIEF_BODY,
  CHIEF_EXIT,
  CHIEF_LOOK,
  CHIEF_OPACITY,
  CHIEF_WINK,
  EASE_IN,
  EASE_LINEAR,
  EASE_OUT,
  EXIT_MS,
  EXIT_SPAN,
  FADE_MS,
  GRADIENT_RING,
  IDLE_BLINK,
  IDLE_BLINK_MS,
  IDLE_ORB_OFFSET,
  MS_PER_PERCENT,
  ORB_BLINK,
  ORB_BODY,
  ORB_EXIT,
  ORB_LOOK,
  ORB_OPACITY,
  planSplash,
  SHORT_END,
  sampleTrack,
  WHITE_RING,
} from "../../lib/brand-splash-timeline";
import { hasSeenFullSplash, markFullSplashSeen } from "../../lib/splash-seen";
import { Fireflies } from "./fireflies";

const BACKGROUND = brand.colors.splashDark;
/** Width of the mark on screen, in points. */
const MARK_WIDTH = 250;
const [VIEW_X, VIEW_Y, VIEW_W, VIEW_H] = parseViewBox(brand.mark.viewBox);
const K = MARK_WIDTH / VIEW_W;
const MARK_HEIGHT = VIEW_H * K;
const VIEW_BOX = brand.mark.viewBox;

const [BLOB_BODY = "", BLOB_EYE_LEFT = "", BLOB_EYE_RIGHT = ""] = subpaths(brand.mark.blob);
const [, ORB_EYE_LEFT = "", ORB_EYE_RIGHT = ""] = subpaths(brand.mark.orb);
const ORB = { cx: 1591.3, cy: 846.5, r: 190.6 };
const WHITE_RING_SPEC = { cx: 920, cy: 1020, r: 420, width: 26 };
const GRADIENT_RING_WIDTH = 22;
const GRADIENT = brand.mark.orbGradient;
const NAVY = brand.colors.splashDark;
const STOPS = brand.colors.orbGradient;

/** A user-unit point as a transform origin, in points inside the mark box. */
function origin(point: { x: number; y: number }): [number, number, number] {
  return [(point.x - VIEW_X) * K, (point.y - VIEW_Y) * K, 0];
}

const CHIEF_PIVOT = origin(pathBottomCenter(BLOB_BODY));
const ORB_PIVOT = origin({ x: ORB.cx, y: ORB.cy + ORB.r });
const ORB_CENTER = origin({ x: ORB.cx, y: ORB.cy });
const WHITE_CENTER = origin({ x: WHITE_RING_SPEC.cx, y: WHITE_RING_SPEC.cy });
const EYES = {
  chiefLeft: origin(pathCenter(BLOB_EYE_LEFT)),
  chiefRight: origin(pathCenter(BLOB_EYE_RIGHT)),
  orbLeft: origin(pathCenter(ORB_EYE_LEFT)),
  orbRight: origin(pathCenter(ORB_EYE_RIGHT)),
};

const FULL_BOX = { width: MARK_WIDTH, height: MARK_HEIGHT } as const;

function Gradient({ id }: { id: string }) {
  return (
    <LinearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={GRADIENT.x1}
      y1={GRADIENT.y1}
      x2={GRADIENT.x2}
      y2={GRADIENT.y2}
    >
      <Stop offset="0" stopColor={STOPS[0]} />
      <Stop offset="0.5" stopColor={STOPS[1]} />
      <Stop offset="1" stopColor={STOPS[2]} />
    </LinearGradient>
  );
}

/** One piece of the mark, drawn in the shared view box so every piece lines up. */
function Piece({ children }: { children: ReactNode }) {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox={VIEW_BOX} width={MARK_WIDTH} height={MARK_HEIGHT}>
      {children}
    </Svg>
  );
}

type Clocks = {
  /** 0..100: percent of the full run. */
  base: SharedValue<number>;
  /** 0..EXIT_SPAN, once the exit starts. */
  exit: SharedValue<number>;
  /** 0..100, looping while idle; 0 otherwise. */
  idle: SharedValue<number>;
};

function useBodyStyle(clocks: Clocks, pose: Track, opacity: Track | null, exitTrack: Track) {
  return useAnimatedStyle(() => {
    const [ty = 0, sx = 1, sy = 1, rot = 0] = sampleTrack(pose, clocks.base.value);
    const [out = 1] = sampleTrack(exitTrack, clocks.exit.value, EASE_IN);
    return {
      opacity: opacity ? (sampleTrack(opacity, clocks.base.value, EASE_LINEAR)[0] ?? 1) : 1,
      transform: [
        { translateY: ty * K },
        { rotate: `${rot}deg` },
        { scaleX: sx * out },
        { scaleY: sy * out },
      ],
    };
  });
}

function useLookStyle(clocks: Clocks, look: Track) {
  return useAnimatedStyle(() => {
    const [x = 0, y = 0] = sampleTrack(look, clocks.base.value);
    return { transform: [{ translateX: x * K }, { translateY: y * K }] };
  });
}

function useBlinkStyle(clocks: Clocks, blink: Track, wink: Track | null, idleOffset: number) {
  return useAnimatedStyle(() => {
    const idlePhase = (clocks.idle.value + idleOffset) % 100;
    const [idleOpen = 1] = clocks.idle.value === 0 ? [1] : sampleTrack(IDLE_BLINK, idlePhase);
    const [open = 1] = sampleTrack(blink, clocks.base.value);
    const [winkOpen = 1] = wink ? sampleTrack(wink, clocks.base.value) : [1];
    return { transform: [{ scaleY: open * winkOpen * idleOpen }] };
  });
}

function Eye({
  style,
  pivot,
  d,
}: {
  style: ReturnType<typeof useBlinkStyle>;
  pivot: [number, number, number];
  d: string;
}) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pivot }, style]}>
      <Piece>
        <Path d={d} fill={NAVY} />
      </Piece>
    </Animated.View>
  );
}

function Chief({ clocks }: { clocks: Clocks }) {
  const body = useBodyStyle(clocks, CHIEF_BODY, CHIEF_OPACITY, CHIEF_EXIT);
  const look = useLookStyle(clocks, CHIEF_LOOK);
  const left = useBlinkStyle(clocks, CHIEF_BLINK, null, 0);
  const right = useBlinkStyle(clocks, CHIEF_BLINK, CHIEF_WINK, 0);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: CHIEF_PIVOT }, body]}>
      <Piece>
        <Path d={BLOB_BODY} fill={brand.colors.blob} />
      </Piece>
      <Animated.View style={[StyleSheet.absoluteFill, look]}>
        <Eye style={left} pivot={EYES.chiefLeft} d={BLOB_EYE_LEFT} />
        <Eye style={right} pivot={EYES.chiefRight} d={BLOB_EYE_RIGHT} />
      </Animated.View>
    </Animated.View>
  );
}

function Orb({ clocks }: { clocks: Clocks }) {
  const body = useBodyStyle(clocks, ORB_BODY, ORB_OPACITY, ORB_EXIT);
  const look = useLookStyle(clocks, ORB_LOOK);
  const left = useBlinkStyle(clocks, ORB_BLINK, null, IDLE_ORB_OFFSET);
  const right = useBlinkStyle(clocks, ORB_BLINK, null, IDLE_ORB_OFFSET);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: ORB_PIVOT }, body]}>
      <Piece>
        <Defs>
          <Gradient id="orb" />
        </Defs>
        <Circle cx={ORB.cx} cy={ORB.cy} r={ORB.r} fill="url(#orb)" />
      </Piece>
      <Animated.View style={[StyleSheet.absoluteFill, look]}>
        <Eye style={left} pivot={EYES.orbLeft} d={ORB_EYE_LEFT} />
        <Eye style={right} pivot={EYES.orbRight} d={ORB_EYE_RIGHT} />
      </Animated.View>
    </Animated.View>
  );
}

function Ring({
  clocks,
  track,
  pivot,
  children,
}: {
  clocks: Clocks;
  track: Track;
  pivot: [number, number, number];
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const [scale = 1, opacity = 0] = sampleTrack(track, clocks.exit.value, EASE_OUT);
    return { opacity, transform: [{ scale }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pivot }, style]}>
      <Piece>{children}</Piece>
    </Animated.View>
  );
}

/**
 * Starts the clocks and decides, from `ready`, taps and elapsed time, when to idle, exit and fade.
 */
function useSplashRun(mode: SplashMode, ready: boolean, skipped: boolean, onDone: () => void) {
  const base = useSharedValue(0);
  const exit = useSharedValue(0);
  const idle = useSharedValue(0);
  const flies = useSharedValue(0);
  const fade = useSharedValue(1);
  const started = useRef(Date.now());
  const exiting = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recheck = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (mode === "static") base.value = 100;
    else {
      const end = mode === "short" ? SHORT_END : 100;
      base.value = withTiming(end, { duration: end * MS_PER_PERCENT, easing: Easing.linear });
      flies.value = withTiming(1e7, { duration: 1e7, easing: Easing.linear });
    }
    return () => {
      cancelAnimation(base);
      cancelAnimation(flies);
      cancelAnimation(idle);
      cancelAnimation(exit);
      cancelAnimation(fade);
      for (const timer of timers.current) clearTimeout(timer);
      clearTimeout(recheck.current);
    };
  }, [mode, base, flies, idle, exit, fade]);

  // Re-plans when the app becomes ready, on a tap, and at each boundary of the run.
  useEffect(() => {
    if (exiting.current) return;
    clearTimeout(recheck.current);
    const plan = planSplash({
      mode,
      elapsedMs: Date.now() - started.current,
      ready: ready,
      skipped,
    });
    if (plan.phase === "idle") {
      if (idle.value === 0) {
        idle.value = withRepeat(
          withTiming(100, { duration: IDLE_BLINK_MS, easing: Easing.linear }),
          -1,
          false,
        );
      }
      return;
    }
    if (plan.phase === "playing") {
      if (plan.recheckInMs !== undefined) {
        recheck.current = setTimeout(() => setTick((n) => n + 1), plan.recheckInMs);
      }
      return;
    }
    exiting.current = true;
    cancelAnimation(idle);
    idle.value = 0;
    const exitMs = mode === "static" ? 0 : EXIT_MS;
    if (exitMs > 0) exit.value = withTiming(EXIT_SPAN, { duration: exitMs, easing: Easing.linear });
    timers.current.push(
      setTimeout(() => {
        fade.value = withTiming(0, { duration: FADE_MS });
      }, exitMs),
      setTimeout(onDone, exitMs + FADE_MS),
    );
  }, [mode, ready, skipped, tick]);

  return { base, exit, idle, flies, fade };
}

/**
 * The launch splash: the Nurlings mark plays over fireflies and fades into the app. The first
 * launch after an install plays the whole run; later launches pop Chief in, raise the orb and
 * leave as soon as the app is `ready`. A tap leaves at once. Decorative, so it is hidden from
 * screen readers.
 */
export function BrandSplash({ ready }: { ready: boolean }) {
  const reduced = useReducedMotion();
  const mode = useMemo<SplashMode>(
    () => (reduced ? "static" : hasSeenFullSplash() ? "short" : "full"),
    [reduced],
  );
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const { base, exit, idle, flies, fade } = useSplashRun(mode, ready, skipped, () => setDone(true));
  const clocks = useMemo<Clocks>(() => ({ base, exit, idle }), [base, exit, idle]);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (mode === "full") markFullSplashSeen();
  }, [mode]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const fliesStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, base.value / 3) }));

  if (done) return null;
  return (
    <Animated.View
      style={[styles.root, fadeStyle]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      // The native splash is the same plain colour, so it can go as soon as this is on screen.
      onLayout={() => void SplashScreen.hideAsync().catch(() => undefined)}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setSkipped(true)}
        accessible={false}
      >
        <Animated.View style={[StyleSheet.absoluteFill, fliesStyle]} pointerEvents="none">
          <Fireflies clock={flies} moving={mode !== "static"} />
        </Animated.View>
        <View
          style={{
            position: "absolute",
            left: (width - MARK_WIDTH) / 2,
            top: (height - MARK_HEIGHT) / 2,
            ...FULL_BOX,
          }}
          pointerEvents="none"
        >
          <Chief clocks={clocks} />
          <Orb clocks={clocks} />
          <Ring clocks={clocks} track={GRADIENT_RING} pivot={ORB_CENTER}>
            <Defs>
              <Gradient id="ring" />
            </Defs>
            <Circle
              cx={ORB.cx}
              cy={ORB.cy}
              r={ORB.r}
              fill="none"
              stroke="url(#ring)"
              strokeWidth={GRADIENT_RING_WIDTH}
            />
          </Ring>
          <Ring clocks={clocks} track={WHITE_RING} pivot={WHITE_CENTER}>
            <Circle
              cx={WHITE_RING_SPEC.cx}
              cy={WHITE_RING_SPEC.cy}
              r={WHITE_RING_SPEC.r}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={WHITE_RING_SPEC.width}
            />
          </Ring>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: BACKGROUND,
    zIndex: 1000,
    elevation: 1000,
  },
});
