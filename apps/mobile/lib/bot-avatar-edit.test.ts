import { describe, expect, it } from "vitest";

import {
  avatarColor,
  avatarShape,
  hasOwnBody,
  isAvatarPhoto,
  withAvatarColor,
  withAvatarShape,
} from "./bot-avatar-edit";

describe("bot avatar editing", () => {
  it("keeps the shape when the color changes", () => {
    expect(withAvatarColor("#3EC5A8::shape_3", "#F5A03C")).toBe("#F5A03C::shape_3");
    expect(withAvatarColor("#3EC5A8", "#F5A03C")).toBe("#F5A03C");
  });

  it("keeps the color when the shape changes", () => {
    expect(withAvatarShape("#F5A03C", 5)).toBe("#F5A03C::shape_5");
    expect(avatarShape("#F5A03C::shape_5")).toBe(5);
    expect(avatarColor("#F5A03C::shape_5")).toBe("#F5A03C");
  });

  it("counts only the organic bodies with their own shape as picked", () => {
    for (const shape of [8, 9, 10, 11]) expect(hasOwnBody(`#F5A03C::shape_${shape}`)).toBe(true);
    for (const value of ["#F5A03C", "#F5A03C::shape_3", "data:image/webp;base64,AAAA"]) {
      expect(hasOwnBody(value)).toBe(false);
    }
  });

  it("replaces a photo with a plain color", () => {
    const photo = "data:image/webp;base64,AAAA";
    expect(isAvatarPhoto(photo)).toBe(true);
    expect(isAvatarPhoto(avatarColor(photo))).toBe(false);
    expect(withAvatarColor(photo, "#6A6BF5")).toBe("#6A6BF5");
    expect(avatarShape(photo)).toBeNull();
  });
});
