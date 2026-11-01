import { BUILTIN_AGENT_SKILLS, RAKAZO_DOCS_URLS } from "./builtin-skills.js";

/**
 * Upstream's "Rakazo" help skill sends a run to upstream's docs site, which has no page for this
 * product. It stays defined upstream (so merges stay clean) and is switched off here: it is not
 * offered as a skill and its pages are not fetched without asking.
 */
const DISABLED = new Set(["Rakazo"]);

export const OFFERED_BUILTIN_SKILLS = BUILTIN_AGENT_SKILLS.filter(
  (skill) => !DISABLED.has(skill.name),
);

export const FETCHABLE_DOCS_URLS: readonly string[] = DISABLED.has("Rakazo")
  ? []
  : RAKAZO_DOCS_URLS;
