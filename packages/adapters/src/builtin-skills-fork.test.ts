import { describe, expect, it } from "vitest";
import { FETCHABLE_DOCS_URLS, OFFERED_BUILTIN_SKILLS } from "./builtin-skills-fork.js";

describe("built-in skills in a Nurlings build", () => {
  it("do not offer upstream's docs skill or fetch its pages without asking", () => {
    expect(OFFERED_BUILTIN_SKILLS.map((skill) => skill.name)).not.toContain("Rakazo");
    expect(OFFERED_BUILTIN_SKILLS.length).toBeGreaterThan(0);
    for (const skill of OFFERED_BUILTIN_SKILLS) expect(skill.content).not.toMatch(/rakazo\.com/i);
    expect(FETCHABLE_DOCS_URLS).toEqual([]);
  });
});
