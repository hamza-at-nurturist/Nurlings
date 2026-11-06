import type { AvatarSwapPhase, AvatarTool } from "@rakazo/core";
import { AVATAR_SWAP_IN_MS, AVATAR_SWAP_OUT_MS } from "@rakazo/core";
import { AVATAR_ILLUSTRATION as ink } from "@rakazo/ui-tokens/avatar-illustration";
import { useEffect } from "react";
import Animated from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import {
  computerMotion,
  ORBIT_LOOP_MS,
  orbitAngle,
  PROP_LOOP_MS,
  ripple,
  searchMotion,
  sweat,
  thinkingDot,
  writeMotion,
} from "../lib/avatar-prop-motion";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The web renderer draws props in a 140-unit storyboard space shown at this scale. */
const STORYBOARD = 0.857;
/** The wave is six short curves, a little over 8 units each. */
const SCRIBBLE_LENGTH = 54;
const WAVE = "M-24 0 q4 -6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0";
const FILL = { position: "absolute" as const, left: 0, top: 0 };

/** A 0–1 loop on the UI thread; it keeps running under Reduce Motion because the caller never mounts it then. */
export function useLoop(ms: number): SharedValue<number> {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: ms, easing: Easing.linear, reduceMotion: ReduceMotion.Never }),
      -1,
      false,
    );
  }, [ms, phase]);
  return phase;
}

/** One layer: an absolutely placed box with the 120-unit avatar viewBox, scaled like the web. */
function Layer({
  size,
  children,
  testID,
}: {
  size: number;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="-60 -60 120 120" style={FILL} testID={testID}>
      <G scale={STORYBOARD}>{children}</G>
    </Svg>
  );
}

/** The distance of one avatar unit in points. */
const unit = (size: number) => (size * STORYBOARD) / 120;

export function OrbitDot({ color, size }: { color: string; size: number }) {
  const phase = useLoop(ORBIT_LOOP_MS);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitAngle(phase.value)}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      testID="avatar-orbit"
      style={[FILL, { width: size, height: size }, style]}
    >
      <Layer size={size}>
        <Circle r="60" fill="none" stroke={color} strokeOpacity={0.18} strokeWidth="1.5" />
        <Circle cx="60" cy="0" r="4.5" fill={color} />
      </Layer>
    </Animated.View>
  );
}

export function Ripples({ color, size }: { color: string; size: number }) {
  const phase = useLoop(PROP_LOOP_MS);
  return (
    <>
      <Ripple color={color} size={size} phase={phase} offset={0} testID="avatar-ripples" />
      <Ripple color={color} size={size} phase={phase} offset={0.5} />
    </>
  );
}

function Ripple({
  color,
  size,
  phase,
  offset,
  testID,
}: {
  color: string;
  size: number;
  phase: SharedValue<number>;
  offset: number;
  testID?: string;
}) {
  const diameter = 100 * unit(size);
  const style = useAnimatedStyle(() => {
    const { scale, opacity } = ripple(phase.value, offset);
    return { opacity, transform: [{ scale }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        {
          position: "absolute",
          left: (size - diameter) / 2,
          top: (size - diameter) / 2,
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderWidth: 1.5,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

/** The progress ring: a track and an arc. Nothing feeds a real progress value yet. */
export function ProgressRing({
  color,
  size,
  progress,
}: {
  color: string;
  size: number;
  progress: number;
}) {
  const r = 63;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <Layer size={size} testID="avatar-ring">
      <Circle r={r} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth="3" />
      <Circle
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        rotation={-90}
        origin="0, 0"
      />
    </Layer>
  );
}

export function SweatDrop({ size }: { size: number }) {
  const phase = useLoop(PROP_LOOP_MS);
  const k = unit(size);
  const style = useAnimatedStyle(() => {
    const { y, opacity } = sweat(phase.value);
    return { opacity, transform: [{ translateY: y * k }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID="avatar-sweat"
      style={[FILL, { width: size, height: size }, style]}
    >
      <Layer size={size}>
        <G x={-34} y={-32}>
          <Path
            d="M0 -6 C3 -1 4 1 4 3 A4 4 0 0 1 -4 3 C-4 1 -3 -1 0 -6Z"
            fill={ink.lineBlue}
            opacity={0.9}
          />
        </G>
      </Layer>
    </Animated.View>
  );
}

export function ThinkingDots({ color, size }: { color: string; size: number }) {
  const phase = useLoop(PROP_LOOP_MS);
  return (
    <>
      <ThinkingDot color={color} size={size} phase={phase} slot={0} testID="avatar-thinking" />
      <ThinkingDot color={color} size={size} phase={phase} slot={1} />
      <ThinkingDot color={color} size={size} phase={phase} slot={2} />
    </>
  );
}

function ThinkingDot({
  color,
  size,
  phase,
  slot,
  testID,
}: {
  color: string;
  size: number;
  phase: SharedValue<number>;
  slot: 0 | 1 | 2;
  testID?: string;
}) {
  const k = unit(size);
  const style = useAnimatedStyle(() => ({ opacity: thinkingDot(phase.value, slot) }));
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        {
          position: "absolute",
          left: size / 2 + (slot - 1) * 22 * k - 8 * k,
          top: size / 2 - 8 * k,
          width: 16 * k,
          height: 16 * k,
          borderRadius: 8 * k,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function SleepZs({ color, size }: { color: string; size: number }) {
  return (
    <Layer size={size} testID="avatar-sleep">
      <G x={34} y={-34}>
        {[0, 1, 2].map((index) => (
          <Path
            key={index}
            transform={`translate(${index * 9} ${-index * 8}) scale(${1 + index * 0.3})`}
            d="M-2.6 -2.6 H2.6 L-2.6 2.6 H2.6"
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.4 + index * 0.2}
          />
        ))}
      </G>
    </Layer>
  );
}

export interface PropAnchors {
  pad: { x: number; y: number };
  lens: { x: number; y: number };
  laptop: { x: number; y: number };
}

/** The swap timings, from the shared reducer's constants, are applied by `ToolSlot`. */
const DROP_UNITS = 14;

/**
 * Holds the prop on screen through a tool swap: while the old prop is `out` it drops and fades, and
 * when the new one is `in` it pops in with a ring burst. At rest it is just the prop.
 */
export function ToolSlot({
  tool,
  phase,
  anchors,
  size,
}: {
  tool: AvatarTool;
  phase: AvatarSwapPhase;
  anchors: PropAnchors;
  size: number;
}) {
  const drop = useSharedValue(0);
  const pop = useSharedValue(1);
  const burst = useSharedValue(0);
  const k = unit(size);
  useEffect(() => {
    if (phase === "out") {
      drop.value = withTiming(1, { duration: AVATAR_SWAP_OUT_MS, easing: Easing.in(Easing.quad) });
    } else if (phase === "in") {
      drop.value = 0;
      pop.value = 0.2;
      pop.value = withSpring(1, { duration: AVATAR_SWAP_IN_MS, dampingRatio: 0.55 });
      burst.value = 0;
      burst.value = withTiming(1, { duration: AVATAR_SWAP_IN_MS, easing: Easing.out(Easing.quad) });
    } else {
      drop.value = 0;
      pop.value = 1;
      burst.value = 1;
    }
  }, [phase, drop, pop, burst]);
  const slot = useAnimatedStyle(() => ({
    opacity: phase === "out" ? 1 - drop.value : Math.min(1, pop.value * 2),
    transform: [{ translateY: drop.value * DROP_UNITS * k }, { scale: 0.85 + 0.15 * pop.value }],
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: phase === "in" ? 0.7 * (1 - burst.value) : 0,
    transform: [{ scale: 0.5 + 1.1 * burst.value }],
  }));
  const centre =
    tool === "search"
      ? anchors.lens
      : { x: 0, y: tool === "write" ? anchors.pad.y : anchors.laptop.y + 14 };
  return (
    <>
      <Animated.View
        pointerEvents="none"
        testID={`avatar-slot-${phase}`}
        style={[FILL, { width: size, height: size }, slot]}
      >
        <ToolProp tool={tool} anchors={anchors} size={size} />
      </Animated.View>
      {phase === "in" ? (
        <Animated.View
          pointerEvents="none"
          testID="avatar-burst"
          style={[
            {
              position: "absolute",
              left: size / 2 + centre.x * STORYBOARD * (size / 120) - 12 * k,
              top: size / 2 + centre.y * STORYBOARD * (size / 120) - 12 * k,
              width: 24 * k,
              height: 24 * k,
              borderRadius: 12 * k,
              borderWidth: 1.5,
              borderColor: ink.white,
            },
            ring,
          ]}
        />
      ) : null}
    </>
  );
}

/** The prop for a tool, drawn at the body's anchors. */
export function ToolProp({
  tool,
  anchors,
  size,
}: {
  tool: AvatarTool;
  anchors: PropAnchors;
  size: number;
}) {
  if (tool === "write") return <WriteProp y={anchors.pad.y} size={size} />;
  if (tool === "search") return <SearchProp x={anchors.lens.x} y={anchors.lens.y} size={size} />;
  if (tool === "computer") return <ComputerProp y={anchors.laptop.y} size={size} />;
  return null;
}

function WriteProp({ y, size }: { y: number; size: number }) {
  const phase = useLoop(PROP_LOOP_MS);
  const k = unit(size);
  const scribble = useAnimatedProps(() => {
    const { reveal, opacity } = writeMotion(phase.value);
    return { strokeDashoffset: SCRIBBLE_LENGTH * (1 - reveal), opacity };
  });
  const pen = useAnimatedStyle(() => {
    const { penX, penY, opacity } = writeMotion(phase.value);
    return { opacity, transform: [{ translateX: penX * k }, { translateY: penY * k }] };
  });
  return (
    <>
      <Layer size={size} testID="avatar-prop-write">
        <G y={y}>
          <Rect fill={ink.paperEdge} x="-31" y="-8" width="62" height="21" rx="3" />
          <Rect fill={ink.paper} x="-31" y="-9" width="62" height="20" rx="3" />
          <Path d="M-26 -3 H26 M-26 6 H26" stroke={ink.paperRule} strokeWidth=".8" />
          <AnimatedPath
            animatedProps={scribble}
            d={WAVE}
            stroke={ink.scribble}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={SCRIBBLE_LENGTH}
          />
        </G>
      </Layer>
      <Animated.View pointerEvents="none" style={[FILL, { width: size, height: size }, pen]}>
        <Layer size={size}>
          <G y={y} rotation={-35}>
            <Path d="M0 0 L7 -2.8 L7 2.8Z" fill={ink.pencilWood} />
            <Path d="M0 0 L2.8 -1.1 L2.8 1.1Z" fill={ink.pencilLead} />
            <Rect x="7" y="-2.8" width="21" height="5.6" fill={ink.pencilBody} />
            <Rect x="7" y="0.6" width="21" height="2.2" fill={ink.pencilShade} />
            <Rect x="7" y="-2.8" width="21" height="1.4" fill={ink.pencilLight} />
            <Rect x="28" y="-2.8" width="3.6" height="5.6" fill={ink.pencilFerrule} />
            <Rect x="31.6" y="-2.8" width="4.8" height="5.6" rx="1.8" fill={ink.pencilEraser} />
          </G>
        </Layer>
      </Animated.View>
    </>
  );
}

function SearchProp({ x, y, size }: { x: number; y: number; size: number }) {
  const phase = useLoop(PROP_LOOP_MS);
  const k = unit(size);
  const style = useAnimatedStyle(() => {
    const motion = searchMotion(phase.value);
    return {
      transform: [
        { translateX: motion.x * k },
        { translateY: motion.y * k },
        { rotate: `${motion.rotate}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID="avatar-prop-search"
      style={[FILL, { width: size, height: size }, style]}
    >
      <Layer size={size}>
        <G x={x} y={y}>
          <Circle fill={ink.lensGlass} fillOpacity={0.55} r="11" />
          <Circle fill="none" stroke={ink.lensFrame} strokeWidth="2.4" r="11" />
          <Path
            d="M-7 -2 A7.4 7.4 0 0 1 -2 -7"
            fill="none"
            stroke={ink.white}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <Path
            d="M8 8 L18 18"
            fill="none"
            stroke={ink.lensFrame}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </G>
      </Layer>
    </Animated.View>
  );
}

function ComputerProp({ y, size }: { y: number; size: number }) {
  const phase = useLoop(PROP_LOOP_MS);
  const glow = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.35 * computerMotion(phase.value).glow,
  }));
  return (
    <>
      <Animated.View
        pointerEvents="none"
        testID="avatar-prop-computer"
        style={[FILL, { width: size, height: size }, glow]}
      >
        <Layer size={size}>
          <Ellipse fill={ink.screenGlow} cx="0" cy={y - 8} rx="28" ry="13" />
        </Layer>
      </Animated.View>
      <Layer size={size}>
        <G y={y}>
          <Ellipse fill={ink.shadow} cx="0" cy="34" rx="34" ry="3" opacity={0.35} />
          <Rect
            fill={ink.lidShell}
            stroke={ink.lidEdge}
            strokeWidth="1.2"
            x="-26"
            y="0"
            width="52"
            height="28"
            rx="5"
          />
          <Circle cx="0" cy="14" r="3.6" fill={ink.white} opacity={0.85} />
          <Circle fill={ink.pencilBody} cx="-17" cy="22" r="1.8" />
          <Circle fill={ink.lineBlue} cx="-11.5" cy="22" r="1.8" />
          <Rect fill={ink.lidBase} x="-31" y="27" width="62" height="4" rx="2" />
        </G>
      </Layer>
      <CodeBit cx={-12} cy={y - 2} index={0} phase={phase} size={size} />
      <CodeBit cx={14} cy={y - 2} index={1} phase={phase} size={size} />
    </>
  );
}

function CodeBit({
  cx,
  cy,
  index,
  phase,
  size,
}: {
  cx: number;
  cy: number;
  index: 0 | 1;
  phase: SharedValue<number>;
  size: number;
}) {
  const k = unit(size);
  const style = useAnimatedStyle(() => {
    const { rise, opacity } = computerMotion(phase.value).bits[index]!;
    return { opacity, transform: [{ translateY: -rise * k }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[FILL, { width: size, height: size }, style]}>
      <Layer size={size}>
        <Circle cx={cx} cy={cy} r="2.2" fill={ink.lineBlue} />
      </Layer>
    </Animated.View>
  );
}
