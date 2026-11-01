import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useMobileTokens } from "../lib/native";
import type { AvatarPipState } from "../lib/organic-avatar-view";

/** The pip's diameter for an avatar `size` points wide; small avatars keep it legible. */
export function avatarPipDiameter(size: number): number {
  return Math.max(8, Math.round(size * 0.3));
}

/**
 * The state pip in the avatar's top-right corner. Only the warning, destructive and success colors
 * are used. It needs no motion, so it is what a still avatar shows.
 */
export function AvatarPip({ pip, size }: { pip: AvatarPipState; size: number }) {
  const tokens = useMobileTokens();
  const diameter = avatarPipDiameter(size);
  const ring = diameter >= 12 ? 2 : 1.5;
  const color =
    pip === "blocked" ? tokens.destructive : pip === "done" ? tokens.success : tokens.warning;
  const hollow = pip === "review";
  return (
    <View
      pointerEvents="none"
      testID={`avatar-pip-${pip}`}
      style={{
        position: "absolute",
        top: -ring,
        right: -ring,
        width: diameter + ring * 2,
        height: diameter + ring * 2,
        borderRadius: diameter,
        backgroundColor: tokens.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: hollow ? "transparent" : color,
          borderWidth: hollow ? Math.max(2, diameter * 0.22) : 0,
          borderColor: color,
        }}
      >
        {pip === "done" && diameter >= 12 ? (
          <Svg width={diameter} height={diameter} viewBox="-8 -8 16 16">
            <Path
              d="M-3.6 0.2 L-1 2.8 L3.8 -2.6"
              fill="none"
              stroke={tokens.background}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}
