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

export type AvatarPoint = readonly [number, number];

/** Points along an absolute M, L, C, Z path, with each curve and line sampled. */
export function svgPathPoints(d: string, steps = 24): AvatarPoint[] {
  const points: AvatarPoint[] = [];
  let current: AvatarPoint = [0, 0];
  for (const segment of d.match(/[MLCZ][^MLCZ]*/g) ?? []) {
    const n = (segment.slice(1).match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (segment[0] === "M") {
      current = [n[0]!, n[1]!];
      points.push(current);
    } else if (segment[0] === "L") {
      const [x0, y0] = current;
      for (let k = 1; k <= steps; k += 1) {
        const t = k / steps;
        points.push([x0 + (n[0]! - x0) * t, y0 + (n[1]! - y0) * t]);
      }
      current = [n[0]!, n[1]!];
    } else if (segment[0] === "C") {
      for (let i = 0; i + 5 < n.length; i += 6) {
        const [x0, y0] = current;
        for (let k = 1; k <= steps; k += 1) {
          const t = k / steps;
          const u = 1 - t;
          points.push([
            u ** 3 * x0 + 3 * u * u * t * n[i]! + 3 * u * t * t * n[i + 2]! + t ** 3 * n[i + 4]!,
            u ** 3 * y0 +
              3 * u * u * t * n[i + 1]! +
              3 * u * t * t * n[i + 3]! +
              t ** 3 * n[i + 5]!,
          ]);
        }
        current = [n[i + 4]!, n[i + 5]!];
      }
    }
  }
  return points;
}

/** Distance from the outline's edge to the middle of the gloss stroke (the stroke is 4.5 wide). */
const GLOSS_INSET = 7;
/** The gloss covers this window of angles from the body's centre, upper left (degrees, y down). */
const GLOSS_FROM = -160;
const GLOSS_TO = -105;

/**
 * A short gloss arc along a body's upper-left shoulder, for bodies that store none. It follows the
 * outline: for each angle it takes the outermost edge point on a ray from the centre and steps in.
 */
export function avatarGlossPath(body: string): string {
  const outline = svgPathPoints(body);
  const b = svgPathBounds(body);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const steps = 6;
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = ((GLOSS_FROM + ((GLOSS_TO - GLOSS_FROM) * i) / steps) * Math.PI) / 180;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    // The farthest outline sample within a thin cone around this ray.
    let reach = 0;
    for (const [x, y] of outline) {
      const along = (x - cx) * dx + (y - cy) * dy;
      const across = Math.abs((x - cx) * dy - (y - cy) * dx);
      if (along > reach && across < 1.5) reach = along;
    }
    const r = Math.max(0, reach - GLOSS_INSET);
    points.push(`${i === 0 ? "M" : "L"}${round(cx + dx * r)} ${round(cy + dy * r)}`);
  }
  return points.join("");
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
