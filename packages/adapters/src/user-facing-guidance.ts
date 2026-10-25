const HIDE_INTERNALS_GUIDANCE =
  "Never mention file system paths, folders, or internal IDs to the user. Refer to files by name and attach anything the user should have. If attaching fails, say so and offer to retry, without a path.";

/** Every run's system prompt ends with this; the people reading the replies are not technical. */
export function withUserFacingGuidance(systemPrompt: string): string {
  return `${systemPrompt}\n\n${HIDE_INTERNALS_GUIDANCE}`;
}
