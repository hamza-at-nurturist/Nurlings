import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChiefAvatar } from "./chief-avatar.js";

describe("ChiefAvatar", () => {
  it("renders without errors in idle state", () => {
    const html = renderToString(<ChiefAvatar size={36} isWorking={false} />);
    expect(html).toContain("<svg");
    expect(html).toContain("rakazo-organic-avatar");
    expect(html).toContain('data-working="false"');
    expect(html).toContain('data-eye-pattern="0"');
  });

  it("renders without errors in working state", () => {
    const html = renderToString(<ChiefAvatar size={36} isWorking={true} />);
    expect(html).toContain('data-working="true"');
    expect(html).toContain("#4FFFDB");
  });

  it("renders the blob body path", () => {
    const html = renderToString(<ChiefAvatar size={36} />);
    expect(html).toContain("<circle");
    expect(html).toContain("<path");
    expect(html).toContain("rakazo-organic-avatar-eyes-idle");
    expect(html).toContain("rakazo-organic-avatar-eyes-working");
  });

  it("accepts a custom size", () => {
    const html = renderToString(<ChiefAvatar size={64} />);
    expect(html).toContain("width:64px");
    expect(html).toContain("height:64px");
  });
});
