/**
 * Fixed illustration colors for the avatar props (pencil, notepad, laptop, magnifier) and the
 * white glints. These are deliberate artwork, not product UI colors: a yellow pencil stays yellow
 * and a laptop stays gray in every theme and on every Nurling color, so they are not semantic tokens
 * and do not follow the no-hardcoded-hex rule for UI. The body uses the bot's color and the pips use
 * the status tokens; nothing else in the avatar may add a literal color here.
 */
export const AVATAR_ILLUSTRATION = {
  white: "#ffffff",
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
} as const;
