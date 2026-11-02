/**
 * Fixed illustration colors for the avatar props (pencil, notepad, laptop, magnifier) and the
 * white glints. These are deliberate artwork, not product UI colors: a yellow pencil stays yellow
 * and a laptop stays gray in every theme and on every Nurling color, so they are not semantic tokens
 * and do not follow the no-hardcoded-hex rule for UI. The body uses the bot's color and the pips use
 * the status tokens; nothing else in the avatar may add a literal color here.
 */
export const AVATAR_ILLUSTRATION = {
  white: "#ffffff",
  /** The glint on a white or very light body, where a white one would vanish. */
  glintOnLight: "#475569",
  pencilBody: "#F5C242",
  pencilShade: "#D9A21B",
  pencilLight: "#FFE08A",
  pencilWood: "#f0d2a8",
  pencilLead: "#3b3c45",
  pencilFerrule: "#b8bcc6",
  pencilEraser: "#F08FA0",
  scribble: "#4b5563",
  paper: "#f4f1e8",
  paperEdge: "#d8d3c2",
  paperRule: "#c9c4b3",
  lensGlass: "#cfe3ff",
  lensFrame: "#8a91a6",
  lidShell: "#3b3c45",
  lidEdge: "#55566a",
  lidBase: "#2a2b31",
  screen: "#141a2b",
  screenGlow: "#9bdcff",
  lineBlue: "#7DD3FC",
  lineYellow: "#F5C242",
  shadow: "#000000",
  /** The gray a blocked body dulls toward. */
  dull: "#7a7a80",
  /** The soft blush on a Done or Asleep face. */
  blush: "#ff7a90",
} as const;

/**
 * How much depth a body gets: a shade fading in from the middle down, a lit rim inside the top edge
 * and a dark rim inside the bottom edge (the body outline stroked, shifted and clipped to the body),
 * all drawn with `white` and `shadow` above. Opacities are 0 to 1; widths and shifts are in motion units.
 */
export const AVATAR_DEPTH = {
  /** The shade is clear down to the middle of this y range, then reaches `shadeOpacity` at its end. */
  shadeFromY: -55,
  shadeToY: 50,
  shadeOpacity: 0.3,
  rimOpacity: 0.3,
  rimWidth: 6,
  rimShift: 4,
  baseOpacity: 0.18,
  baseWidth: 7,
  baseShift: 5,
  blushOpacity: 0.5,
} as const;
