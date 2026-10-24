// Pieces of the brand mark for the splash, taken from the brand's own paths.

export type Point = { x: number; y: number };

/** `mark.blob` and `mark.orb` are compound paths: the body, then its eyes. */
export function subpaths(d: string): string[] {
  return d
    .split(/(?=M)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Bounds of a subpath's end points (the last two numbers of every command). */
export function pathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const command of d.match(/[A-Za-z][^A-Za-z]*/g) ?? []) {
    const numbers =
      command
        .slice(1)
        .match(/-?\d*\.?\d+/g)
        ?.map(Number) ?? [];
    if (numbers.length < 2) continue;
    const x = numbers[numbers.length - 2] ?? 0;
    const y = numbers[numbers.length - 1] ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

export function pathCenter(d: string): Point {
  const b = pathBounds(d);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function pathBottomCenter(d: string): Point {
  const b = pathBounds(d);
  return { x: (b.minX + b.maxX) / 2, y: b.maxY };
}

/** `viewBox` string to `[x, y, width, height]`. */
export function parseViewBox(viewBox: string): [number, number, number, number] {
  const [x = 0, y = 0, w = 0, h = 0] = viewBox.split(/\s+/).map(Number);
  return [x, y, w, h];
}
