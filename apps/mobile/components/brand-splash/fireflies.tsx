import { brand } from "@nurlings/brand";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";

const [TEAL, BLUE, VIOLET] = brand.colors.orbGradient;

// Fixed, so every launch looks the same. `offset` staggers them so some start mid-screen.
const FLIES = [
  { x: 0.12, size: 3, color: TEAL, seconds: 17, offset: 0.55 },
  { x: 0.28, size: 2, color: BLUE, seconds: 21, offset: 0.1 },
  { x: 0.42, size: 4, color: VIOLET, seconds: 15, offset: 0.8 },
  { x: 0.58, size: 3, color: TEAL, seconds: 19, offset: 0.35 },
  { x: 0.72, size: 2, color: BLUE, seconds: 14, offset: 0.65 },
  { x: 0.86, size: 4, color: VIOLET, seconds: 18, offset: 0.2 },
  { x: 0.2, size: 3, color: BLUE, seconds: 20, offset: 0.9 },
  { x: 0.92, size: 2, color: TEAL, seconds: 16, offset: 0.45 },
] as const;

const MAX_OPACITY = 0.55;
const GLOW_ALPHA = 0.45;

type Fly = (typeof FLIES)[number];

function Firefly({
  fly,
  clock,
  width,
  height,
}: {
  fly: Fly;
  clock: SharedValue<number>;
  width: number;
  height: number;
}) {
  // The glow reaches three dot-widths out.
  const box = fly.size * 8;
  const style = useAnimatedStyle(() => {
    const phase = (clock.value / (fly.seconds * 1000) + fly.offset) % 1;
    // Sideways: right by 14 over the first half of the climb, then back and left by 10.
    const drift = phase < 0.5 ? 14 * (phase / 0.5) : 14 - 24 * ((phase - 0.5) / 0.5);
    return {
      opacity: MAX_OPACITY * Math.min(1, phase / 0.1, (1 - phase) / 0.15),
      transform: [{ translateX: drift }, { translateY: (1 - phase) * (height + 2 * box) - box }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: "absolute", left: fly.x * width - box / 2, top: 0, width: box, height: box },
        style,
      ]}
    >
      <Svg width={box} height={box}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={fly.color} stopOpacity={GLOW_ALPHA} />
            <Stop offset="1" stopColor={fly.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={box / 2} cy={box / 2} r={box / 2} fill="url(#glow)" />
        <Circle cx={box / 2} cy={box / 2} r={fly.size / 2} fill={fly.color} />
      </Svg>
    </Animated.View>
  );
}

/** Eight dots rising past the mark, and a very faint glow along the bottom. */
export function Fireflies({
  clock,
  moving,
}: {
  /** Milliseconds, counting up. */
  clock: SharedValue<number>;
  moving: boolean;
}) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="floor" cx="50%" cy="100%" rx="70%" ry="100%" fx="50%" fy="100%">
            <Stop offset="0" stopColor={BLUE} stopOpacity={0.12} />
            <Stop offset="1" stopColor={BLUE} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={height * 0.55} width={width} height={height * 0.45} fill="url(#floor)" />
      </Svg>
      {moving
        ? FLIES.map((fly) => (
            <Firefly key={fly.x} fly={fly} clock={clock} width={width} height={height} />
          ))
        : null}
    </View>
  );
}
