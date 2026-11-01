import { describe, expect, it } from "vitest";
import { BUILTIN_AGENT_SKILLS } from "./builtin-skills.js";

describe("Nurlings skill", () => {
  it("answers from its own text and links to no docs", () => {
    const skill = BUILTIN_AGENT_SKILLS.find((s) => s.name === "Nurlings")!;
    expect(skill).toBeDefined();
    expect(skill.content).not.toMatch(/https?:\/\//);
  });
});
