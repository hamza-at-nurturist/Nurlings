import { brand } from "@nurlings/brand";
import { AVATAR_MOTION_UNITS } from "@rakazo/core";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import type { AvatarLife } from "../lib/avatar-life";
import { eyeState } from "./bot-avatar";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const BLOB_SCALE = 0.0701;
const BLOB_TX = -921.5;
const BLOB_TY = -1003;

function chiefEyeLocalPositions() {
  const { chiefEyeLeft, chiefEyeRight, chiefEyeAngleDeg } = brand.mark;
  const angle = (chiefEyeAngleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toAvatar = (cx: number, cy: number) => ({
    ax: (cx + BLOB_TX) * BLOB_SCALE,
    ay: (cy + BLOB_TY) * BLOB_SCALE,
  });
  const unrotate = (ax: number, ay: number) => ({
    lx: ax * cos + ay * sin,
    ly: -ax * sin + ay * cos,
  });
  const left = toAvatar(chiefEyeLeft.cx, chiefEyeLeft.cy);
  const right = toAvatar(chiefEyeRight.cx, chiefEyeRight.cy);
  return {
    left: unrotate(left.ax, left.ay),
    right: unrotate(right.ax, right.ay),
  };
}

const EYE_LOCAL = chiefEyeLocalPositions();

type BodyStyle = ReturnType<typeof import("react-native-reanimated").useAnimatedStyle>;

export function ChiefAvatar({
  size,
  life,
  bodyStyle,
}: {
  size: number;
  life: AvatarLife;
  bodyStyle: BodyStyle;
}) {
  const scale = 120 / AVATAR_MOTION_UNITS;

  const leftXBase = EYE_LOCAL.left.lx - 3.5;
  const leftYCenter = EYE_LOCAL.left.ly;
  const rightXBase = EYE_LOCAL.right.lx - 3.5;
  const rightYCenter = EYE_LOCAL.right.ly;

  const leftEyeProps = useAnimatedProps(() => {
    "worklet";
    const state = eyeState(life);
    const height = state.hidden ? 0 : 24 * state.lid;
    return {
      x: leftXBase + state.x * scale,
      y: leftYCenter - height / 2 + state.y * scale,
      height,
    };
  });

  const rightEyeProps = useAnimatedProps(() => {
    "worklet";
    const state = eyeState(life);
    const height = state.hidden ? 0 : 24 * state.lid;
    return {
      x: rightXBase + state.x * scale,
      y: rightYCenter - height / 2 + state.y * scale,
      height,
    };
  });

  return (
    <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
      <Svg width={size} height={size} viewBox="-60 -60 120 120">
        <Circle r={60} fill={brand.colors.iconBackground} />
        <G transform={`scale(${BLOB_SCALE}) translate(${BLOB_TX}, ${BLOB_TY})`}>
          <Path d={brand.mark.blobBody} fill={brand.colors.blob} />
        </G>
        <G transform={`rotate(${brand.mark.chiefEyeAngleDeg})`}>
          <AnimatedRect animatedProps={leftEyeProps} width={7} rx={3.5} fill="#101014" />
          <AnimatedRect animatedProps={rightEyeProps} width={7} rx={3.5} fill="#101014" />
        </G>
      </Svg>
    </Animated.View>
  );
}
