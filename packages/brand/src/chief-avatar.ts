import { brand } from "./index.js";

/** Avatar space is the shared -60..60 box; the disc fills it. */
export const CHIEF_AVATAR_RADIUS = 60;

// The blob's bounding box centre in mark coordinates, and the scale that leaves padding inside the disc.
const BLOB_CENTER = { x: 922.27, y: 1023.46 };
const BLOB_SCALE = 0.0664;
// The logo's pill eyes: 65.2 wide, 175.9 long including the round caps.
const EYE_WIDTH = 65.2 * BLOB_SCALE;
const EYE_HEIGHT = 175.9 * BLOB_SCALE;

const toAvatar = (point: { cx: number; cy: number }) => ({
  x: (point.cx - BLOB_CENTER.x) * BLOB_SCALE,
  y: (point.cy - BLOB_CENTER.y) * BLOB_SCALE,
});

// Eye centres are placed in avatar space; the eyes themselves live in a group rotated by the logo tilt.
function toTiltedFrame(point: { x: number; y: number }, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: point.x * Math.cos(radians) + point.y * Math.sin(radians),
    y: -point.x * Math.sin(radians) + point.y * Math.cos(radians),
  };
}

function eyeRect(point: { cx: number; cy: number }) {
  const centre = toTiltedFrame(toAvatar(point), brand.mark.chiefEyeAngleDeg);
  return {
    x: centre.x - EYE_WIDTH / 2,
    y: centre.y - EYE_HEIGHT / 2,
    centreY: centre.y,
    width: EYE_WIDTH,
    height: EYE_HEIGHT,
    radius: EYE_WIDTH / 2,
  };
}

/** Where the Chief avatar draws the logo blob and its two pill eyes, in avatar space. */
export const chiefAvatarGeometry = {
  blobTransform: `scale(${BLOB_SCALE}) translate(${-BLOB_CENTER.x}, ${-BLOB_CENTER.y})`,
  eyeTiltDeg: brand.mark.chiefEyeAngleDeg,
  eyes: [eyeRect(brand.mark.chiefEyeLeft), eyeRect(brand.mark.chiefEyeRight)] as const,
};
