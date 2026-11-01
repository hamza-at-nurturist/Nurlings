import { AVATAR_ILLUSTRATION as ink } from "@rakazo/ui-tokens/avatar-illustration";

/** Pieces of the organic avatar drawn in the 140-unit storyboard space (scaled by the caller). */

const WAVE = "M-24 0 q4 -6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0";
const SPARKLE = "M0 -4 L1.2 -1.2 L4 0 L1.2 1.2 L0 4 L-1.2 1.2 L-4 0 L-1.2 -1.2Z";
export const AVATAR_SPIRAL =
  "M0 0 C1.8 -1.6 4.2 -0.2 3.6 2.2 C2.8 5 -1.6 5.6 -4.2 3.2 C-7 0.4 -5.8 -4.8 -1.8 -6.4 C2.8 -8 8.2 -4.6 8.4 0.6";
const STAR_PATH = "M20 0 A20 7 0 1 1 -20 0 A20 7 0 1 1 20 0";

/** Pip beside the body: only the warning, destructive and success status colors. */
export function AvatarPip({ state }: { state: "needs" | "review" | "blocked" | "done" }) {
  return (
    <g transform="translate(40 -40)">
      <g className="rakazo-av-pip">
        <circle className="rakazo-av-pip-ring" r="12" />
        {state === "needs" ? <circle className="rakazo-av-pip-warn" r="8" /> : null}
        {state === "review" ? <circle className="rakazo-av-pip-hollow" r="6.5" /> : null}
        {state === "blocked" ? <circle className="rakazo-av-pip-bad" r="8" /> : null}
        {state === "done" ? (
          <>
            <circle className="rakazo-av-pip-good" r="8" />
            <path className="rakazo-av-tick" d="M-3.6 0.2 L-1 2.8 L3.8 -2.6" />
          </>
        ) : null}
      </g>
    </g>
  );
}

/** Three stars circling overhead while dizzy; SMIL keeps them on a flat ellipse, so this is web-only. */
export function AvatarStars({ y }: { y: number }) {
  return (
    <g className="rakazo-av-stars" transform={`translate(0 ${y})`}>
      {[0, -0.37, -0.73].map((begin) => (
        <circle key={begin} r="3.5">
          <animateMotion dur="1.1s" begin={`${begin}s`} repeatCount="indefinite" path={STAR_PATH} />
        </circle>
      ))}
    </g>
  );
}

export function AvatarSleepZ() {
  return (
    <g transform="translate(34 -34)">
      <text className="rakazo-av-z rakazo-av-z1" x="0" y="0">
        z
      </text>
      <text className="rakazo-av-z rakazo-av-z2" x="9" y="-8">
        z
      </text>
      <text className="rakazo-av-z rakazo-av-z3" x="18" y="-16">
        z
      </text>
    </g>
  );
}

export function AvatarSweat() {
  return (
    <g transform="translate(-34 -32)">
      <path className="rakazo-av-sweat" d="M0 -6 C3 -1 4 1 4 3 A4 4 0 0 1 -4 3 C-4 1 -3 -1 0 -6Z" />
    </g>
  );
}

/** Pencil writing a line on a small notepad, in step through SMIL. */
export function WriteProp({ y }: { y: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <g className="rakazo-av-prop">
        <rect fill={ink.paperEdge} x="-31" y="-8" width="62" height="21" rx="3" />
        <rect fill={ink.paper} x="-31" y="-9" width="62" height="20" rx="3" />
        <path d="M-26 -3 H26 M-26 6 H26" stroke={ink.paperRule} strokeWidth=".8" />
      </g>
      <path className="rakazo-av-scribble" stroke={ink.scribble} pathLength="1" d={WAVE}>
        <animate
          attributeName="stroke-dashoffset"
          values="1;0;0"
          keyTimes="0;0.55;1"
          dur="3.4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;1;0"
          keyTimes="0;0.86;1"
          dur="3.4s"
          repeatCount="indefinite"
        />
      </path>
      <g>
        <animateMotion
          path={WAVE}
          keyPoints="0;1;1"
          keyTimes="0;0.55;1"
          calcMode="linear"
          dur="3.4s"
          repeatCount="indefinite"
        />
        <g className="rakazo-av-prop" transform="rotate(-35)">
          <path d="M0 0 L7 -2.8 L7 2.8Z" fill={ink.pencilWood} />
          <path d="M0 0 L2.8 -1.1 L2.8 1.1Z" fill={ink.pencilLead} />
          <rect x="7" y="-2.8" width="21" height="5.6" fill={ink.pencilBody} />
          <rect x="7" y="0.6" width="21" height="2.2" fill={ink.pencilShade} />
          <rect x="7" y="-2.8" width="21" height="1.4" fill={ink.pencilLight} />
          <rect x="8" y="-2.3" width="19" height="0.9" rx="0.45" fill={ink.white} opacity=".65" />
          <path className="rakazo-av-twinkle" transform="translate(15 -3)" d={SPARKLE} />
          <rect x="28" y="-2.8" width="3.6" height="5.6" fill={ink.pencilFerrule} />
          <rect x="31.6" y="-2.8" width="4.8" height="5.6" rx="1.8" fill={ink.pencilEraser} />
        </g>
      </g>
    </g>
  );
}

/** A magnifier circling at the body's side. */
export function SearchProp({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="rakazo-av-lens rakazo-av-prop">
        <circle className="rakazo-av-lens-fill" fill={ink.lensGlass} r="11" />
        <circle className="rakazo-av-lens-ring" stroke={ink.lensFrame} r="11" />
        <path className="rakazo-av-lens-glint" stroke={ink.white} d="M-7 -2 A7.4 7.4 0 0 1 -2 -7" />
        <path
          className="rakazo-av-lens-spark"
          fill={ink.white}
          d="M2 -3 L3 0 L6 1 L3 2 L2 5 L1 2 L-2 1 L1 0Z"
        />
        <circle cx="-5.2" cy="-5.6" r="1.5" fill={ink.white} opacity=".95" />
        <path className="rakazo-av-lens-handle" stroke={ink.lensFrame} d="M8 8 L18 18" />
        <path
          d="M9.6 7.4 L17.8 15.6"
          stroke={ink.white}
          strokeOpacity=".4"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="rakazo-av-twinkle rakazo-av-twinkle-2"
          transform="translate(-8 -8)"
          d={SPARKLE}
        />
      </g>
    </g>
  );
}

/** A laptop whose screen faces the Nurling: the viewer sees the lid back. */
export function ComputerProp({ y }: { y: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <ellipse className="rakazo-av-glow" fill={ink.screenGlow} cx="0" cy="-8" rx="28" ry="13" />
      <ellipse fill={ink.shadow} cx="0" cy="34" rx="34" ry="3" opacity=".35" />
      <g className="rakazo-av-prop">
        <circle className="rakazo-av-bit rakazo-av-bit-1" cx="-12" cy="-2" r="2.2" />
        <circle className="rakazo-av-bit rakazo-av-bit-2" cx="14" cy="-2" r="2.2" />
        <g className="rakazo-av-lid">
          <rect
            fill={ink.lidShell}
            stroke={ink.lidEdge}
            strokeWidth="1.2"
            x="-26"
            y="0"
            width="52"
            height="28"
            rx="5"
          />
          <circle className="rakazo-av-lid-logo" cx="0" cy="14" r="3.6" />
          <circle fill={ink.pencilBody} cx="-17" cy="22" r="1.8" />
          <circle fill={ink.lineBlue} cx="-11.5" cy="22" r="1.8" />
          <path
            d="M-21 0 H-3 L-17 28 H-21 A5 5 0 0 1 -26 23 V5 A5 5 0 0 1 -21 0Z"
            fill={ink.white}
            opacity=".13"
          />
          <path
            d="M-20 0.8 H20"
            stroke={ink.white}
            strokeOpacity=".3"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path className="rakazo-av-twinkle" transform="translate(-19 5)" d={SPARKLE} />
        </g>
        <rect fill={ink.lidBase} x="-31" y="27" width="62" height="4" rx="2" />
        <rect fill={ink.white} x="-29" y="27.4" width="58" height="0.9" rx="0.45" opacity=".18" />
      </g>
    </g>
  );
}
