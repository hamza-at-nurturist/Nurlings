import type { BuiltinToolName } from "@rakazo/contracts";

/** What a working avatar holds: a notepad and pencil, a magnifier, a laptop, or nothing (the orbit dot). */
export type AvatarTool = "write" | "search" | "computer" | "none";
/** The categories the worker puts on a tool-called event. A tool outside the map carries none. */
export type AvatarToolCategory = Exclude<AvatarTool, "none">;

/**
 * Built-in tool names by category. Exact names only: a provider's free-text status, an MCP
 * server's tools and integration tools are not ours to classify, so they stay unmapped.
 * Keyed by `BuiltinToolName`, so a renamed or removed tool fails the typecheck.
 */
export const AVATAR_TOOL_CATEGORY = {
  write_file: "write",
  scratchpad_add: "write",
  scratchpad_update: "write",
  scratchpad_complete: "write",
  scratchpad_remove: "write",
  scratchpad_list: "write",
  remember: "write",
  save_memory: "write",
  save_shared_memory: "write",
  skill_create: "write",
  skill_update: "write",
  ticket_comment: "write",
  web_search: "search",
  web_fetch: "search",
  search_history: "search",
  read_history: "search",
  recall_memory: "search",
  read_file: "search",
  list_files: "search",
  skill_read: "search",
  ticket_get: "search",
  computer_observe: "computer",
  computer_act: "computer",
  browser_navigate: "computer",
  browser_snapshot: "computer",
  browser_act: "computer",
  user_computer_shell: "computer",
  user_computer_observe: "computer",
  user_computer_act: "computer",
  shell: "computer",
  open_path: "computer",
  launch_app: "computer",
} as const satisfies Partial<Record<BuiltinToolName, AvatarToolCategory>>;

/** The avatar category of a tool name, or undefined for any tool outside the map. */
export function avatarToolCategory(name: unknown): AvatarToolCategory | undefined {
  if (typeof name !== "string" || !Object.hasOwn(AVATAR_TOOL_CATEGORY, name)) return undefined;
  return AVATAR_TOOL_CATEGORY[name as keyof typeof AVATAR_TOOL_CATEGORY];
}

/** The tool a client got on a tool-called payload; anything else, including older events, is none. */
export function avatarToolFromPayload(payload: Record<string, unknown>): AvatarTool {
  const tool = payload.tool;
  return tool === "write" || tool === "search" || tool === "computer" ? tool : "none";
}
