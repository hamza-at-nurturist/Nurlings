/**
 * Shared drawing for the icon scripts: the brand's mark as SVG, placed on a square canvas.
 * Everything is derived from brand.json, whose mark data is checked against the source SVGs.
 */
import sharp from "sharp";
import { brand } from "../src/index.ts";

const [vx = 0, vy = 0, vw = 0, vh = 0] = brand.mark.viewBox.split(" ").map(Number);
const [sx = 0, sy = 0, sw = 0, sh = 0] = brand.mark.smallViewBox.split(" ").map(Number);

/** Width and height of the mark in its own units. */
export const FULL = { width: vw, height: vh, cx: vx + vw / 2, cy: vy + vh / 2 } as const;
export const SMALL = { width: sw, height: sh, cx: sx + sw / 2, cy: sy + sh / 2 } as const;

const [orbA, orbB, orbC] = brand.colors.orbGradient;
const g = brand.mark.orbGradient;

export const gradientDefs = (id = "orb") =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">` +
  `<stop offset="0" stop-color="${orbA}"/><stop offset="0.5" stop-color="${orbB}"/><stop offset="1" stop-color="${orbC}"/></linearGradient>`;

interface Placement {
  /** Canvas centre the mark is centred on. */
  x: number;
  y: number;
  /** Width the mark is drawn at, in canvas units. */
  width: number;
  /** A point of the mark, in its own units, to put at the centre instead of the frame's centre. */
  about?: { x: number; y: number };
}

/** The blob, and the orb unless `blobOnly`, centred at a canvas position and scaled to a width. */
export function markGroup(
  placement: Placement,
  options: { blobOnly?: boolean; blobFill?: string; orbId?: string } = {},
): string {
  const frame = options.blobOnly ? SMALL : FULL;
  const scale = placement.width / frame.width;
  const fill = options.blobFill ?? brand.colors.blob;
  const orb = options.blobOnly
    ? ""
    : `<path fill="url(#${options.orbId ?? "orb"})" fill-rule="evenodd" d="${brand.mark.orb}"/>`;
  return (
    `<g transform="translate(${placement.x} ${placement.y}) scale(${scale}) translate(${-(placement.about?.x ?? frame.cx)} ${-(placement.about?.y ?? frame.cy)})">` +
    `<path fill="${fill}" fill-rule="evenodd" d="${brand.mark.blob}"/>${orb}</g>`
  );
}

export function canvas(size: number, body: string, options: { gradient?: boolean } = {}): Buffer {
  const defs = options.gradient === false ? "" : `<defs>${gradientDefs()}</defs>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}${body}</svg>`,
  );
}

/** The favicon: a navy rounded plate with the blob filling most of it (the orb's eyes vanish at 16px). */
export function faviconSvg(size: number): Buffer {
  const radius = size * 0.22;
  const plate = `<rect width="${size}" height="${size}" rx="${radius}" fill="${brand.colors.iconBackground}"/>`;
  return canvas(
    size,
    plate + markGroup({ x: size / 2, y: size / 2, width: size * 0.74 }, { blobOnly: true }),
    { gradient: false },
  );
}

type Point = readonly [x: number, y: number];

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function circleFrom(points: Point[]): { x: number; y: number; r: number } {
  if (points.length === 1) return { x: points[0]![0], y: points[0]![1], r: 0 };
  if (points.length === 2) {
    const [a, b] = points as [Point, Point];
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, r: distance(a, b) / 2 };
  }
  const [a, b, c] = points as [Point, Point, Point];
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const ux =
    ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) +
      (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) +
      (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) /
    d;
  const uy =
    ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) +
      (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) +
      (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) /
    d;
  return { x: ux, y: uy, r: distance([ux, uy], a) };
}

/** The smallest circle containing every point (incremental algorithm, fixed order so it is reproducible). */
export function enclosingCircle(points: Point[]): { x: number; y: number; r: number } {
  const inside = (c: { x: number; y: number; r: number }, p: Point) =>
    distance([c.x, c.y], p) <= c.r + 1e-9;
  let circle = circleFrom([points[0]!]);
  for (let i = 1; i < points.length; i += 1) {
    if (inside(circle, points[i]!)) continue;
    circle = circleFrom([points[i]!]);
    for (let j = 0; j < i; j += 1) {
      if (inside(circle, points[j]!)) continue;
      circle = circleFrom([points[i]!, points[j]!]);
      for (let k = 0; k < j; k += 1) {
        if (!inside(circle, points[k]!)) circle = circleFrom([points[i]!, points[j]!, points[k]!]);
      }
    }
  }
  return circle;
}

/**
 * Places the mark so the smallest circle around its visible shapes is centred on the canvas and has
 * the given diameter: as large as it can be while staying inside that circle. The mark's corners
 * are empty, so this is larger than fitting its bounding box.
 */
export async function fitInCircle(
  centre: { x: number; y: number },
  diameter: number,
  blobOnly = false,
): Promise<Placement> {
  const frame = blobOnly ? SMALL : FULL;
  const unit = 0.5; // pixels per mark unit for the measurement
  const [fx, fy] = blobOnly ? [sx, sy] : [vx, vy];
  const width = Math.ceil(frame.width * unit);
  const height = Math.ceil(frame.height * unit);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${fx} ${fy} ${frame.width} ${frame.height}">` +
      `<path fill="#fff" fill-rule="evenodd" d="${brand.mark.blob}"/>` +
      (blobOnly ? "" : `<path fill="#fff" fill-rule="evenodd" d="${brand.mark.orb}"/>`) +
      "</svg>",
  );
  const { data, info } = await sharp(svg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const points: Point[] = [];
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3] ?? 0;
      if (alpha < 128) continue;
      // Only edge pixels can lie on the enclosing circle.
      const edge = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => {
        if (nx! < 0 || ny! < 0 || nx! >= info.width || ny! >= info.height) return true;
        return (data[(ny! * info.width + nx!) * info.channels + 3] ?? 0) < 128;
      });
      if (edge) points.push([fx + (x + 0.5) / unit, fy + (y + 0.5) / unit]);
    }
  }
  const circle = enclosingCircle(points);
  return {
    x: centre.x,
    y: centre.y,
    width: (frame.width * diameter) / 2 / circle.r,
    about: { x: circle.x, y: circle.y },
  };
}
