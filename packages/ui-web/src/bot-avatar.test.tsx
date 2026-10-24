import { ACTIVE_RUN_STATUSES, SHIPPED_BOT_AVATAR_SHAPE_KEYS } from "@rakazo/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BOT_AVATAR_COLORS,
  BotAvatar,
  BotShapePreview,
  DEFAULT_BOT_AVATAR_COLOR,
  defaultBotAvatarValue,
  parseBotAvatar,
  resolvePersonaColorDef,
} from "./bot-avatar.js";

describe("BotAvatar", () => {
  it("renders distinct SVG gradient IDs for concurrent working avatars", () => {
    const html = renderToString(
      <div>
        <BotAvatar color="#8B5CF6::shape_0" status="running" />
        <BotAvatar color="#10B981::shape_1" status="running" />
      </div>,
    );

    const gradMatches = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(gradMatches).toHaveLength(4);
    expect(new Set(gradMatches).size).toBe(4);
    for (const id of gradMatches) {
      expect(id).toBeTruthy();
      expect(html).toContain(`url(#${id})`);
    }
  });

  it.each([...ACTIVE_RUN_STATUSES])("marks active run status %s as working", (status) => {
    const html = renderToString(<BotAvatar color="#3B82F6" status={status} />);
    expect(html).toContain("<svg");
    expect(html).toContain('data-working="true"');
  });

  it("keeps working attribute false when idle", () => {
    const html = renderToString(<BotAvatar color="#F59E0B" status="idle" />);
    expect(html).toContain('data-working="false"');
  });

  it("renders distinct shapes for distinct bot identities", () => {
    const maya = renderToString(<BotAvatar color={DEFAULT_BOT_AVATAR_COLOR} identity="maya" />);
    const github = renderToString(<BotAvatar color={DEFAULT_BOT_AVATAR_COLOR} identity="github" />);
    expect(maya).not.toEqual(github);
  });

  it("parses shape indexes from encoded color values", () => {
    const parsed = parseBotAvatar(`${DEFAULT_BOT_AVATAR_COLOR}::shape_3`);
    expect(parsed.color).toBe(DEFAULT_BOT_AVATAR_COLOR);
    expect(parsed.shapeIndex).toBe(3);
    expect(parsed.isImage).toBe(false);
  });

  it("normalizes malformed shape suffixes to shape 0", () => {
    expect(parseBotAvatar(`${DEFAULT_BOT_AVATAR_COLOR}::shape_-1`).shapeIndex).toBe(0);
    expect(parseBotAvatar(`${DEFAULT_BOT_AVATAR_COLOR}::shape_3junk`).shapeIndex).toBe(0);
    expect(parseBotAvatar(`${DEFAULT_BOT_AVATAR_COLOR}::shape_`).shapeIndex).toBe(0);
  });

  it("resolves explicit colors and shapes", () => {
    expect(resolvePersonaColorDef("bot", "#10B981").hex.toLowerCase()).toBe("#10b981");
    expect(resolvePersonaColorDef("bot", "#fff").hex).toBe("#fff");
    expect(BOT_AVATAR_COLORS.length).toBeGreaterThan(0);
  });

  it("falls back to the identity palette for invalid custom hex", () => {
    expect(resolvePersonaColorDef("bot", "#zzzzzz")).toEqual(resolvePersonaColorDef("bot"));
    expect(resolvePersonaColorDef("bot", "#ggg")).toEqual(resolvePersonaColorDef("bot"));
  });

  it("renders uploaded images without the geometric svg", () => {
    const html = renderToString(
      <BotAvatar color="data:image/png;base64,abc" identity="maya" size={32} />,
    );
    expect(html).toContain("<img");
    expect(html).not.toContain("<path");
    expect(html).not.toContain("bot-character-eyes");
  });

  it("keeps a working photo ring outside the clipped image and uses the status token", () => {
    const html = renderToString(
      <BotAvatar color="data:image/png;base64,abc" identity="maya" size={32} status="running" />,
    );
    expect(html).toContain('class="rakazo-bot-avatar relative shrink-0 select-none"');
    expect(html).toContain("rakazo-bot-avatar-picture");
    expect(html).toContain("rakazo-bot-avatar-ring-working");
    expect(html).toContain("stroke-status-working");
    expect(html).toContain('data-working="true"');
    expect(html.indexOf("rakazo-bot-avatar-picture")).toBeLessThan(
      html.indexOf("rakazo-bot-avatar-ring"),
    );
  });

  it("keeps idle photo avatars ring-free", () => {
    const html = renderToString(
      <BotAvatar color="data:image/png;base64,abc" identity="maya" size={32} status="idle" />,
    );
    expect(html).toContain("rakazo-bot-avatar-picture");
    expect(html).toContain('data-working="false"');
    expect(html).not.toContain("rakazo-bot-avatar-ring");
  });

  it("does not treat arbitrary http(s) color values as remote images", () => {
    const parsed = parseBotAvatar("https://evil.example/track.png");
    expect(parsed.isImage).toBe(false);
    expect(parsed.imageUrl).toBeUndefined();
    const html = renderToString(
      <BotAvatar color="https://evil.example/track.png" identity="maya" size={32} />,
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("evil.example");
  });

  it("honors reduced-motion for the working mascot pulse class", () => {
    const html = renderToString(
      <BotAvatar color="#8B5CF6::shape_0" identity="maya" size={32} status="running" />,
    );
    expect(html).toContain("animate-pulse");
    expect(html).toContain("motion-reduce:animate-none");
  });

  it("restores a plain color that renders the organic body instead of a pinned shape", () => {
    expect(defaultBotAvatarValue(`${DEFAULT_BOT_AVATAR_COLOR}::shape_3`)).toBe(
      DEFAULT_BOT_AVATAR_COLOR,
    );
    expect(defaultBotAvatarValue("#EAB308::shape_1")).toBe("#EAB308");
    expect(defaultBotAvatarValue("#abc::shape_2")).toBe("#abc");
    expect(defaultBotAvatarValue("#fff")).toBe("#fff");
    expect(defaultBotAvatarValue("data:image/png;base64,abc")).toBe(DEFAULT_BOT_AVATAR_COLOR);
    expect(defaultBotAvatarValue("#zzzzzz::shape_1")).toBe(DEFAULT_BOT_AVATAR_COLOR);
    expect(defaultBotAvatarValue("")).toBe(DEFAULT_BOT_AVATAR_COLOR);

    const restored = renderToString(
      <BotAvatar
        color={defaultBotAvatarValue(`${DEFAULT_BOT_AVATAR_COLOR}::shape_4`)}
        identity="maya"
      />,
    );
    const shaped = renderToString(
      <BotAvatar color={`${DEFAULT_BOT_AVATAR_COLOR}::shape_4`} identity="maya" />,
    );
    expect(restored).toContain("rakazo-organic-avatar");
    expect(restored).not.toContain("bot-character-eyes");
    expect(shaped).toContain("bot-character-eyes");
    expect(shaped).not.toContain("rakazo-organic-avatar");
  });

  it("exposes shape picker name and pressed state", () => {
    const html = renderToString(
      <BotShapePreview shapeIndex={0} color="#8B5CF6" selected onClick={() => undefined} />,
    );
    expect(html).toContain('aria-label="hex"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("focus-visible:ring-2");
  });

  it("previews an organic body when no studio shape is given", () => {
    const html = renderToString(
      <BotShapePreview identity="maya" label="Shape 1" color="#8B5CF6" selected={false} />,
    );
    expect(html).toContain('aria-label="Shape 1"');
    expect(html).toContain("rakazo-organic-avatar");
  });

  it("draws every plain-colour bot with the organic body", () => {
    const html = renderToString(<BotAvatar color={DEFAULT_BOT_AVATAR_COLOR} identity="maya" />);
    expect(html).toContain("rakazo-organic-avatar");
    expect(html).not.toContain("rakazo-bot-avatar-visor");
  });

  it("keeps uploaded images", () => {
    const html = renderToString(<BotAvatar color="data:image/png;base64,abc" identity="maya" />);
    expect(html).toContain("<img");
    expect(html).not.toContain("rakazo-organic-avatar");
  });

  it("keeps an encoded studio shape", () => {
    const html = renderToString(
      <BotAvatar color={`${DEFAULT_BOT_AVATAR_COLOR}::shape_3`} identity="maya" />,
    );
    expect(html).toContain("bot-character-eyes");
    expect(html).not.toContain("rakazo-organic-avatar");
  });

  it("fills the organic body with the resolved palette hex when the custom color is invalid", () => {
    const fallback = resolvePersonaColorDef("maya", "#zzzzzz");
    const html = renderToString(<BotAvatar color="#zzzzzz" identity="maya" />);
    expect(html).toContain("rakazo-organic-avatar");
    expect(html).toContain(`fill="${fallback.hex}"`);
    expect(html).not.toContain("#zzzzzz");
  });

  it("draws the brand blob through the normal shape path, in the picked colour", () => {
    const index = SHIPPED_BOT_AVATAR_SHAPE_KEYS.indexOf("nurling");
    const colorDef = resolvePersonaColorDef("preview", DEFAULT_BOT_AVATAR_COLOR);
    const html = renderToString(
      <BotAvatar color={`${DEFAULT_BOT_AVATAR_COLOR}::shape_${index}`} identity="chief" />,
    );
    expect(html).toContain("rakazo-bot-avatar");
    expect(html).toContain("bot-character-eyes");
    expect(html).toContain(`url(#bot-ink-`);
    expect(html).toContain(colorDef.light);
    // Two pills in each of the idle and working eye groups.
    expect(html.match(/<rect/g)).toHaveLength(4);
    expect(html).not.toContain("<ellipse");
    expect(html).toContain("rotate(13.5 ");
  });

  it("lists the brand blob in the shape picker like any other shape", () => {
    const index = SHIPPED_BOT_AVATAR_SHAPE_KEYS.indexOf("nurling");
    const html = renderToString(
      <BotShapePreview shapeIndex={index} color="#8B5CF6" selected onClick={() => undefined} />,
    );
    expect(html).toContain('aria-label="nurling"');
    expect(html.match(/<rect/g)).toHaveLength(2);
  });

  it("gives the brand blob the organic eye hooks, seeded per bot, and leaves the classic shapes alone", () => {
    const index = SHIPPED_BOT_AVATAR_SHAPE_KEYS.indexOf("nurling");
    const render = (color: string, identity: string, status?: string) =>
      renderToString(<BotAvatar color={color} identity={identity} status={status} />);
    const blob = render(`#8B5CF6::shape_${index}`, "chief", "running");
    expect(blob).toContain("rakazo-shape-eyes");
    expect(blob).toContain('data-working="true"');
    expect(blob).toMatch(/data-eye-pattern="[0-3]"/);
    expect(blob).toContain("rakazo-organic-avatar-eyes-idle");
    expect(blob).toContain("rakazo-organic-avatar-eyes-working");
    expect(blob.match(/<rect/g)).toHaveLength(4);
    // Organic-only checks keep telling an organic body from a shape.
    expect(blob).not.toContain('class="rakazo-organic-avatar ');
    expect(blob).not.toMatch(/class="[^"]*\brakazo-organic-avatar\b(?!-)/);

    const patterns = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map(
        (id) => render(`#8B5CF6::shape_${index}`, id).match(/data-eye-pattern="(\d)"/)?.[1],
      ),
    );
    expect(patterns.size).toBeGreaterThan(1);
    expect(render(`#8B5CF6::shape_${index}`, "chief")).toBe(
      render(`#8B5CF6::shape_${index}`, "chief"),
    );

    const classic = render("#8B5CF6::shape_3", "chief", "running");
    expect(classic).not.toContain("rakazo-shape-eyes");
    expect(classic).not.toContain("data-eye-pattern");
    expect(classic).not.toContain("rakazo-organic-avatar-eyes");
    expect(classic).toContain("<ellipse");
  });

  it("keeps the shape picker preview still", () => {
    const index = SHIPPED_BOT_AVATAR_SHAPE_KEYS.indexOf("nurling");
    const html = renderToString(<BotShapePreview shapeIndex={index} color="#8B5CF6" />);
    expect(html).not.toContain("rakazo-organic-avatar-eyes");
    expect(html).not.toContain("rakazo-shape-eyes");
  });
});
