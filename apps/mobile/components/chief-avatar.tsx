import { brand } from "@nurlings/brand";
import { CHIEF_AVATAR_RADIUS, chiefAvatarGeometry } from "@nurlings/brand/chief-avatar";
import { AVATAR_MOTION_UNITS } from "@rakazo/core";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import type { AvatarLife } from "../lib/avatar-life";
import { eyeState } from "./bot-avatar";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const { blobTransform, eyeTiltDeg, eyes } = chiefAvatarGeometry;
const [leftEye, rightEye] = eyes;
// Offsets are in motion units, scaled to this 120-unit box.
const MOTION_SCALE = 120 / AVATAR_MOTION_UNITS;

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
  const eyeProps = (eye: typeof leftEye) => () => {
    "worklet";
    const state = eyeState(life);
    const height = state.hidden ? 0 : eye.height * state.lid;
    return {
      x: eye.x + state.x * MOTION_SCALE,
      y: eye.centreY - height / 2 + state.y * MOTION_SCALE,
      height,
    };
  };
  const leftEyeProps = useAnimatedProps(eyeProps(leftEye));
  const rightEyeProps = useAnimatedProps(eyeProps(rightEye));

  return (
    <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
      <Svg width={size} height={size} viewBox="-60 -60 120 120">
        <Circle r={CHIEF_AVATAR_RADIUS} fill={brand.colors.iconBackground} />
        <Path d={brand.mark.blobBody} transform={blobTransform} fill={brand.colors.blob} />
        <G transform={`rotate(${eyeTiltDeg})`}>
          <AnimatedRect
            animatedProps={leftEyeProps}
            width={leftEye.width}
            rx={leftEye.radius}
            fill={brand.colors.iconBackground}
          />
          <AnimatedRect
            animatedProps={rightEyeProps}
            width={rightEye.width}
            rx={rightEye.radius}
            fill={brand.colors.iconBackground}
          />
        </G>
      </Svg>
    </Animated.View>
  );
}
