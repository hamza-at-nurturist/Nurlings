import type { AvatarTool, OrganicBotAvatarFrame } from "@rakazo/core";
import {
  AVATAR_STILL_MAX_SIZE,
  avatarFollowStrength,
  avatarGlossPath,
  avatarIdentitySeed,
  avatarPropAnchors,
  isRunWaitingOnUser,
  isRunWorking,
  organicAvatarPath,
  svgPathBounds,
} from "@rakazo/core";
import { tokens } from "@rakazo/ui-tokens";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AVATAR_ILLUSTRATION as ink } from "./avatar-illustration.js";
import { registerAvatarPointer } from "./avatar-pointer.js";
import { useAvatarMotionVisibility } from "./hooks/use-avatar-motion-visibility.js";
import { cn } from "./lib/utils.js";
import {
  AVATAR_SPIRAL,
  AvatarPip,
  AvatarSleepZ,
  AvatarStars,
  AvatarSweat,
  ComputerProp,
  SearchProp,
  WriteProp,
} from "./organic-avatar-props.js";
import type { AvatarStateSource } from "./use-avatar-state.js";
import { useAvatarState, useToolSwap } from "./use-avatar-state.js";
import "./organic-avatar.css";

export interface OrganicAvatarProps extends AvatarStateSource {
  color: string;
  identity?: string;
  size: number;
  /** A fixed body, eyes and gloss to draw instead of the seeded organic ones. */
  frame?: OrganicBotAvatarFrame;
  /** Scales how far the face follows the pointer; the brand blob's eyes sit near its edge. */
  reach?: number;
  /** The Nurling's name. With it the avatar is an image named "{name}, {state}". */
  name?: string;
  /** Spoken name for each state; defaults to English. */
  stateNames?: Record<string, string>;
  className?: string;
}

const STATE_NAMES: Record<string, string> = {
  idle: "idle",
  thinking: "thinking",
  working: "working",
  needs: "needs you",
  review: "in review",
  blocked: "blocked",
  done: "done",
  asleep: "asleep",
};

interface EyeSpec {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  tilt: number;
}

function eyeSpecs(frame: OrganicBotAvatarFrame | undefined): EyeSpec[] {
  if (!frame) {
    return [-10.5, 10.5].map((cx) => ({ cx, cy: 0, rx: 3.5, ry: 12, tilt: 0 }));
  }
  const tilt = frame.eyes.kind === "pill" ? frame.eyes.tiltDeg : 0;
  return [frame.eyes.left, frame.eyes.right].map(({ cx, cy }) => ({
    cx,
    cy,
    rx: frame.eyes.rx,
    ry: frame.eyes.ry,
    tilt,
  }));
}

/** True for a body so light that a white glint would vanish on it. */
function isLightColor(color: string): boolean {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
  if (!hex) return false;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 200;
}

const reducedMotionMedia = "(prefers-reduced-motion: reduce)";
const reducedMotionSnapshot = () => window.matchMedia(reducedMotionMedia).matches;
function subscribeToReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia(reducedMotionMedia);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const eyeTransform = (eye: EyeSpec) => `translate(${eye.cx} ${eye.cy}) rotate(${eye.tilt})`;
const eyeHalfWidth = (eye: EyeSpec) => Math.max(eye.rx, 3.5) * 1.5;

export function OrganicAvatar({
  color,
  identity,
  size,
  frame,
  reach = 1,
  name,
  stateNames,
  className,
  ...source
}: OrganicAvatarProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
  const { ref, visible } = useAvatarMotionVisibility(!reducedMotion);
  const still = reducedMotion || size <= AVATAR_STILL_MAX_SIZE;
  const { state, working } = useAvatarState(source);
  const propTool: AvatarTool = state === "working" ? working.tool : "none";
  const swap = useToolSwap(propTool, !still);
  const [shaken, setShaken] = useState(false);
  const dizzy = shaken && !still && state !== "asleep" && state !== "thinking";

  const seed = avatarIdentitySeed(identity || color);
  const body = frame?.path ?? organicAvatarPath(seed);
  const bounds = useMemo(() => svgPathBounds(body), [body]);
  const gloss = frame?.gloss ?? avatarGlossPath(body);
  const anchors = useMemo(() => avatarPropAnchors(bounds), [bounds]);
  const eyes = useMemo(() => eyeSpecs(frame), [frame]);

  // What the working avatar looks like. The prop on screen lags the tool while a swap plays.
  const working_ = state === "working";
  const look = !working_
    ? undefined
    : swap.shown !== "none"
      ? swap.shown
      : working.look === "tool"
        ? "orbit"
        : working.look;
  const long = working.long && (state === "working" || state === "thinking");

  const follow = avatarFollowStrength(state, swap.shown);
  const followRef = useRef(follow);
  followRef.current = follow;
  useEffect(() => {
    if (still) return;
    const element = ref.current;
    if (!element) return;
    const unregister = registerAvatarPointer({
      element,
      strength: () => followRef.current,
      reach,
      onDizzy: setShaken,
    });
    return () => {
      unregister();
      // The controller no longer knows this avatar, so nothing else would ever calm it.
      setShaken(false);
    };
  }, [ref, still, reach]);
  useEffect(() => {
    // jsdom has no SMIL clock, so these are optional.
    if (visible) ref.current?.unpauseAnimations?.();
    else ref.current?.pauseAnimations?.();
  }, [ref, visible]);

  const stateName = (stateNames ?? STATE_NAMES)[state] ?? STATE_NAMES[state];
  const swapping = swap.phase !== "rest";
  const showProp = !still && working_ && swap.shown !== "none";
  const pip = state === "needs" || state === "review" || state === "blocked" || state === "done";
  const eyeRotation = frame ? undefined : `rotate(${(seed % 9) - 4})`;

  return (
    <svg
      ref={ref}
      viewBox="-60 -60 120 120"
      role={name ? "img" : undefined}
      aria-label={name ? `${name}, ${stateName}` : undefined}
      aria-hidden={name ? undefined : true}
      className={cn("rakazo-organic-avatar select-none", className)}
      data-working={isRunWorking(source.status) || isRunWaitingOnUser(source.status)}
      data-state={state}
      data-look={look}
      data-tool={propTool}
      data-long={long}
      data-still={still}
      data-dizzy={dizzy}
      data-swapping={swapping}
      data-glint="true"
      data-glint-tone={frame?.glint ?? (isLightColor(color) ? "light" : undefined)}
      data-paused={!visible}
      data-shape-family={seed % 10}
      data-eye-pattern={seed % 4}
      style={
        {
          width: size,
          height: size,
          "--c0": color,
          "--rakazo-av-eye": tokens.background,
          "--rakazo-av-ink": tokens.foreground,
          "--rakazo-av-glint-dark": ink.glintOnLight,
          "--rakazo-av-white": ink.white,
          "--rakazo-av-dull": ink.dull,
          "--rakazo-av-shadow": ink.shadow,
        } as CSSProperties
      }
    >
      <g transform="scale(0.857)">
        {still ? null : (
          <>
            {look === "ripple" ? (
              <g className="rakazo-av-ripples">
                <circle r="50" />
                <circle r="50" />
              </g>
            ) : null}
            {look === "ring" ? (
              <g>
                <circle className="rakazo-av-track" r="63" />
                <circle
                  className="rakazo-av-prog"
                  r="63"
                  strokeDasharray="396"
                  strokeDashoffset={396 * (1 - Math.min(1, Math.max(0, source.progress ?? 0)))}
                />
              </g>
            ) : null}
            <g className="rakazo-av-orbit">
              <circle r="64" fill="none" />
              <circle className="rakazo-av-trail" r="60" />
              <circle className="rakazo-av-orb" cx="60" cy="0" r="4.5" />
            </g>
          </>
        )}
      </g>
      <g className="rakazo-av-look">
        <g className="rakazo-av-shell">
          <g className="rakazo-av-body">
            <path className="rakazo-av-fill" d={body} />
            <path className="rakazo-av-gloss" d={gloss} />
          </g>
          <g className="rakazo-av-gaze">
            <g transform={eyeRotation}>
              <g className="rakazo-av-eyes">
                <g className="rakazo-av-pills">
                  {eyes.map((eye) => (
                    <g key={eye.cx} transform={eyeTransform(eye)}>
                      <g className="rakazo-av-pill">
                        <rect
                          x={-eye.rx}
                          y={-eye.ry}
                          width={eye.rx * 2}
                          height={eye.ry * 2}
                          rx={eye.rx}
                        />
                        <circle
                          className="rakazo-av-catch"
                          cx={-eye.rx * 0.25}
                          cy={-eye.ry * 0.45}
                          r={Math.max(1.4, eye.rx * 0.55)}
                        />
                      </g>
                    </g>
                  ))}
                </g>
                <g>
                  {eyes.map((eye) => (
                    <g key={eye.cx} transform={eyeTransform(eye)}>
                      <path
                        className="rakazo-av-happy"
                        d={`M${-eyeHalfWidth(eye)} 4 Q0 -8 ${eyeHalfWidth(eye)} 4`}
                      />
                      <path
                        className="rakazo-av-shut"
                        d={`M${-eyeHalfWidth(eye)} 1 Q0 7 ${eyeHalfWidth(eye)} 1`}
                      />
                      <g className="rakazo-av-spiral">
                        <path className="rakazo-av-sp" d={AVATAR_SPIRAL} />
                      </g>
                    </g>
                  ))}
                </g>
              </g>
            </g>
          </g>
          {showProp ? (
            <g transform="scale(0.857)">
              <g className="rakazo-av-slot" data-phase={swap.phase}>
                {swap.shown === "write" ? <WriteProp y={anchors.pad.y} /> : null}
                {swap.shown === "search" ? (
                  <SearchProp x={anchors.lens.x} y={anchors.lens.y} />
                ) : null}
                {swap.shown === "computer" ? <ComputerProp y={anchors.laptop.y} /> : null}
                {swap.phase === "in" ? (
                  <circle
                    className="rakazo-av-poof"
                    stroke={ink.white}
                    cx={swap.shown === "search" ? anchors.lens.x : 0}
                    cy={
                      swap.shown === "search"
                        ? anchors.lens.y
                        : swap.shown === "write"
                          ? anchors.pad.y
                          : anchors.laptop.y + 14
                    }
                    r="12"
                  />
                ) : null}
              </g>
            </g>
          ) : null}
        </g>
      </g>
      <g transform="scale(0.857)">
        {still ? null : (
          <>
            {long ? <AvatarSweat /> : null}
            <g className="rakazo-av-dots">
              <circle cx="-22" cy="0" r="8" />
              <circle cx="0" cy="0" r="8" />
              <circle cx="22" cy="0" r="8" />
            </g>
            {dizzy ? <AvatarStars y={anchors.stars.y} /> : null}
            {state === "asleep" ? <AvatarSleepZ /> : null}
          </>
        )}
        {pip ? <AvatarPip state={state as "needs" | "review" | "blocked" | "done"} /> : null}
      </g>
    </svg>
  );
}
