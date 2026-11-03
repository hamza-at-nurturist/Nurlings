/**
 * The icons an app file may name. A short list on purpose: a name outside it is refused with the
 * rest of the file, so a file can never ask for anything but a drawing from this set.
 */
export const ICON_NAMES = [
  "activity",
  "alert-triangle",
  "arrow-up-down",
  "bell",
  "calendar",
  "check",
  "chevron-left",
  "chevron-right",
  "clock",
  "dollar-sign",
  "external-link",
  "file-text",
  "filter",
  "home",
  "list",
  "message-square",
  "more-horizontal",
  "phone",
  "play",
  "refresh",
  "search",
  "settings",
  "thumbs-down",
  "thumbs-up",
  "trending-up",
  "users",
  "x",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
