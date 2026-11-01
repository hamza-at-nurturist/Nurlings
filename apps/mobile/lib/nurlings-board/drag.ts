/** Where the pager's pages sit, so a finger position can be turned into a column. */
export type PagerLayout = {
  pageWidth: number;
  gap: number;
  /** Padding before the first page and after the last. */
  edge: number;
  count: number;
};

/** The width one page takes in the pager, gap included. */
function step(layout: PagerLayout): number {
  return layout.pageWidth + layout.gap;
}

/** The column under `x` (pager coordinates) with the pager scrolled to `scrollX`; null in the gaps,
 * the padding and past either end. */
export function columnAt(x: number, scrollX: number, layout: PagerLayout): number | null {
  const content = x + scrollX - layout.edge;
  if (content < 0) return null;
  const index = Math.floor(content / step(layout));
  if (index >= layout.count) return null;
  return content - index * step(layout) < layout.pageWidth ? index : null;
}

/** Signed scroll speed in pixels per frame for a finger at `position` along an axis `size` long:
 * 0 outside the `zone` at either end, rising to `maxSpeed` at the edge, negative toward the start. */
export function edgeScrollSpeed(
  position: number,
  size: number,
  zone: number,
  maxSpeed: number,
): number {
  if (zone <= 0) return 0;
  if (position < zone) return -maxSpeed * Math.min(1, (zone - position) / zone);
  if (position > size - zone) return maxSpeed * Math.min(1, (position - (size - zone)) / zone);
  return 0;
}

/** The furthest the pager can scroll for a viewport `viewWidth` wide. */
export function maxPagerOffset(viewWidth: number, layout: PagerLayout): number {
  const content =
    layout.edge * 2 + layout.count * layout.pageWidth + (layout.count - 1) * layout.gap;
  return Math.max(0, content - viewWidth);
}

/** The offset of the page nearest `scrollX`, where the pager settles when a drag ends. */
export function snapOffset(scrollX: number, layout: PagerLayout): number {
  const index = Math.min(layout.count - 1, Math.max(0, Math.round(scrollX / step(layout))));
  return index * step(layout);
}
