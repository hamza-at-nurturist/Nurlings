import { BUILTIN_AGENT_SKILLS } from "./builtin-skills.js";

/**
 * Upstream's "Nurlings" help skill is defined upstream (so merges stay clean) and is switched off
 * here: it is not offered as a skill and no docs pages are fetched without asking.
 */
const DISABLED = new Set(["Nurlings"]);

export const OFFERED_BUILTIN_SKILLS = BUILTIN_AGENT_SKILLS.filter(
  (skill) => !DISABLED.has(skill.name),
);

export const FETCHABLE_DOCS_URLS: readonly string[] = [];
