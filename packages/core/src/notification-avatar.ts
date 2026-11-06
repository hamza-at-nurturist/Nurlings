import { BotAvatarValueSchema, parseBotAvatarValue } from "@rakazo/contracts";
import { lightTokens } from "@rakazo/ui-tokens";
import { avatarIdentitySeed, ORGANIC_AVATAR_VIEWBOX, organicAvatarPath } from "./avatar-shape.js";
import { botEyeInk, resolvePersonaColorDef } from "./bot-avatar-colors.js";
import type { OrganicBotAvatarFrame } from "./bot-avatar-shapes.js";
import { organicBotAvatarFrame } from "./bot-avatar-shapes.js";
import {
  LOGO_AVATAR_BODY_Y,
  LOGO_AVATAR_EYES,
  LOGO_AVATAR_VIEWBOX,
  LOGO_BODY_PATH,
  logoAvatarEyeInk,
} from "./logo-avatar-art.js";
import { logoAvatarTraits } from "./logo-avatar-traits.js";

/** A static notification portrait, with the same identity, saved photo and silhouette as chat. */
export function notificationAvatarSource(bot: {
  id: string;
  color: string;
  avatarSet?: string | null;
}): string {
  const parsed = BotAvatarValueSchema.safeParse(bot.color).success
    ? parseBotAvatarValue(bot.color)
    : null;
  if (parsed?.kind === "image") return parsed.imageUrl;
  const color = resolvePersonaColorDef(
    bot.id,
    parsed && "color" in parsed ? parsed.color : bot.color,
  ).hex;
  // The push is flattened onto white, so the eyes are inked for a light page.
  let viewBox: string;
  let body: string;
  if (bot.avatarSet === "rakazo" && parsed?.kind !== "shape") {
    const fill = logoAvatarTraits(bot.id, color).color;
    const { width, height, leftCx, rightCx, cy } = LOGO_AVATAR_EYES;
    const eyes = [leftCx, rightCx]
      .map((cx) => `<ellipse cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}"/>`)
      .join("");
    viewBox = LOGO_AVATAR_VIEWBOX;
    body = `<g transform="translate(0 ${LOGO_AVATAR_BODY_Y})"><path d="${LOGO_BODY_PATH}" fill="${fill}"/><g fill="${logoAvatarEyeInk(fill, lightTokens)}">${eyes}</g></g>`;
  } else {
    // The fork's organic avatar, as chat draws it: a shape with its own body (the brand blob and
    // the original bodies) keeps that body and eyes; every other bot draws the body its id picks.
    const frame = parsed?.kind === "shape" ? organicBotAvatarFrame(parsed.shapeIndex) : undefined;
    const seed = avatarIdentitySeed(bot.id);
    viewBox = ORGANIC_AVATAR_VIEWBOX;
    const tilt = frame ? "" : ` transform="rotate(${(seed % 9) - 4})"`;
    body = `<g transform="scale(0.857)"><path d="${frame?.path ?? organicAvatarPath(seed)}" fill="${color}"/><g${tilt}>${pillEyes(frame, botEyeInk(color, lightTokens))}</g></g>`;
  }
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="${viewBox}">${body}</svg>`)}`;
}

/** The chat avatar's pill eyes: the frame's own, or the standard pair. */
function pillEyes(frame: OrganicBotAvatarFrame | undefined, fill: string): string {
  const eyes = frame
    ? [frame.eyes.left, frame.eyes.right].map(({ cx, cy }) => ({
        cx,
        cy,
        rx: frame.eyes.rx,
        ry: frame.eyes.ry,
        tilt: frame.eyes.kind === "pill" ? frame.eyes.tiltDeg : 0,
      }))
    : [-10.5, 10.5].map((cx) => ({ cx, cy: 0, rx: 3.5, ry: 12, tilt: 0 }));
  const pills = eyes
    .map(
      ({ cx, cy, rx, ry, tilt }) =>
        `<g transform="translate(${cx} ${cy}) rotate(${tilt})"><rect x="${-rx}" y="${-ry}" width="${rx * 2}" height="${ry * 2}" rx="${rx}"/></g>`,
    )
    .join("");
  return `<g fill="${fill}">${pills}</g>`;
}
