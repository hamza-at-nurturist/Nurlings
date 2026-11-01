import { describe, expect, it } from "vitest";
import { BUILTIN_AGENT_SKILLS, RAKAZO_DOCS_URLS } from "./builtin-skills.js";

describe("built-in skills", () => {
  it("do not send a run to upstream's docs site, which has no page for this product", () => {
    expect(RAKAZO_DOCS_URLS).toEqual([]);
    for (const skill of BUILTIN_AGENT_SKILLS) {
      expect(skill.content, skill.name).not.toMatch(/rakazo\.com/i);
    }
    expect(BUILTIN_AGENT_SKILLS.map((skill) => skill.name)).not.toContain("Rakazo");
  });
});
