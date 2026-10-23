import { describe, expect, it } from "vitest";
import { NestMoodSchema, NestSnapshotSchema } from "./nest.js";

describe("nest snapshot", () => {
  it("parses named sections and ignores sections it does not know", () => {
    const parsed = NestSnapshotSchema.parse({
      nurlings: [
        {
          id: "bot-1",
          name: "Ada",
          title: "",
          color: "#F97316::shape_2",
          mood: "needs_you",
          currentTask: null,
          nextRoutine: { routineId: "r-1", name: "Inbox", at: "2026-03-10T14:00:00.000Z" },
        },
      ],
      needsYou: [
        {
          botId: "bot-1",
          groupId: null,
          runId: "run-1",
          messageId: null,
          kind: "takeover",
          text: null,
          askedAt: "2026-03-10T12:00:00.000Z",
        },
      ],
      someFutureSection: [{ anything: true }],
    });
    expect(parsed.nurlings[0]?.mood).toBe("needs_you");
    expect("someFutureSection" in parsed).toBe(false);
  });

  it("rejects an unknown mood", () => {
    expect(NestMoodSchema.safeParse("sleepy").success).toBe(false);
    expect(NestMoodSchema.safeParse("needs_approval").success).toBe(false);
  });
});
