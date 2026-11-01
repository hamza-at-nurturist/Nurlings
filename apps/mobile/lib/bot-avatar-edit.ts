import { BOT_COLORS, parseBotAvatarValue } from "@rakazo/contracts";
import { PICKABLE_ORGANIC_SHAPE_INDEXES } from "@rakazo/core";

/** The color a bot avatar value is drawn in; a photo falls back to the first palette color. */
export function avatarColor(value: string): string {
  const parsed = parseBotAvatarValue(value);
  return parsed.kind === "color" || parsed.kind === "shape" ? parsed.color : BOT_COLORS[0];
}

export function avatarShape(value: string): number | null {
  const parsed = parseBotAvatarValue(value);
  return parsed.kind === "shape" ? parsed.shapeIndex : null;
}

/** True when the value picks one of the organic bodies with its own shape; otherwise the bot draws its default body. */
export function hasOwnBody(value: string): boolean {
  const shape = avatarShape(value);
  return shape !== null && PICKABLE_ORGANIC_SHAPE_INDEXES.includes(shape);
}

export function isAvatarPhoto(value: string): boolean {
  return parseBotAvatarValue(value).kind === "image";
}

/** Keeps a chosen shape when the color changes; a photo is replaced by the color. */
export function withAvatarColor(value: string, color: string): string {
  const shape = avatarShape(value);
  return shape === null ? color : `${color}::shape_${shape}`;
}

export function withAvatarShape(value: string, shape: number): string {
  return `${avatarColor(value)}::shape_${shape}`;
}
