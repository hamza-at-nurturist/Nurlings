export interface AvatarBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** The box around every coordinate pair in an absolute SVG path (control points included). */
export function svgPathBounds(d: string): AvatarBounds {
  const numbers = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i]!;
    const y = numbers[i + 1]!;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
  }
  return Number.isFinite(bounds.minX) ? bounds : { minX: -50, minY: -50, maxX: 50, maxY: 50 };
}

const round = (value: number) => Math.round(value * 100) / 100;

/** A short gloss arc along a body's upper-left shoulder, for bodies that store none. */
export function avatarGlossPath(b: AvatarBounds): string {
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const at = (u: number, v: number) => `${round(b.minX + w * u)} ${round(b.minY + h * v)}`;
  return `M${at(0.18, 0.5)} C${at(0.2, 0.36)} ${at(0.3, 0.26)} ${at(0.42, 0.22)}`;
}

/** Where the props, pip and stars sit, in the 140-unit storyboard space, for a body's bounds (-60..60 box). */
export const AVATAR_STORYBOARD_SCALE = 60 / 70;
export function avatarPropAnchors(b: AvatarBounds) {
  const k = AVATAR_STORYBOARD_SCALE;
  const minY = b.minY / k;
  const maxY = b.maxY / k;
  const maxX = b.maxX / k;
  return {
    pad: { x: 0, y: round(maxY + 11) },
    lens: { x: round(maxX - 5), y: round(minY + (maxY - minY) * 0.18) },
    laptop: { x: 0, y: round(maxY - 10) },
    stars: { x: 0, y: round(minY - 12) },
  };
}
