import { brand } from "@nurlings/brand";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { builtinAgentTools } from "./builtin-tools.js";
import { withUserFacingGuidance } from "./user-facing-guidance.js";

type FakeTool = {
  name: string;
  execute: (id: string, params: Record<string, unknown>) => Promise<unknown>;
};

const seen = vi.hoisted(() => ({ systemPrompts: [] as string[] }));

vi.mock("@earendil-works/pi-agent-core", () => ({
  Agent: class {
    state = { errorMessage: undefined as string | undefined, messages: [] as unknown[] };
    private readonly tools: FakeTool[];
    constructor(options: { initialState: { tools: FakeTool[]; systemPrompt: string } }) {
      this.tools = options.initialState.tools;
      seen.systemPrompts.push(options.initialState.systemPrompt);
    }
    subscribe() {}
    async prompt() {
      // The main agent hands a task to a helper so the helper's system prompt is built too.
      await this.tools
        .find((tool) => tool.name === "run_subagent")
        ?.execute("call-1", { name: "scout", task: "count the files" });
      this.state.messages = [{ role: "assistant", content: [{ type: "text", text: "Done." }] }];
    }
    async waitForIdle() {}
    abort() {}
  },
}));
vi.mock("@earendil-works/pi-ai/providers/all", () => ({
  builtinModels: () => ({
    getModel: (_provider: string, modelId: string) =>
      modelId === "plain-model" ? { provider: "test", id: modelId, reasoning: false } : undefined,
    streamSimple: () => {
      throw new Error("the fake agent must not call a provider");
    },
  }),
}));
vi.mock("./pi-local-provider.js", () => ({ registerLocalProvider: (models: unknown) => models }));
vi.mock("./pi-openai-compatible-provider.js", () => ({
  OPENAI_COMPATIBLE_PROVIDER_ID: "openai-compatible",
  registerOpenAiCompatibleCatalog: (models: unknown) => models,
  registerOpenAiCompatibleRuntime: (models: unknown) => models,
}));

import { PiAgentRuntime } from "./pi-runtime.js";

const computerObserve = {
  name: "computer_observe",
  description: "Observe the computer",
  inputSchema: { type: "object", properties: {} },
};

async function run(tools: unknown[]) {
  for await (const _event of new PiAgentRuntime().run(
    {
      botId: "b",
      threadId: "t",
      runId: "r",
      prompt: "hello",
      instructions: "",
      history: [],
      tools,
      model: { provider: "test", id: "plain-model" },
      executeTool: vi.fn(async () => ({ ok: true })),
    } as never,
    {
      operationId: "1",
      traceId: "1",
      spaceId: "w",
      userId: "u",
      signal: new AbortController().signal,
    },
  )) {
    // Drain so every agent is built.
  }
}

describe("system prompts sent to a model", () => {
  beforeEach(() => {
    seen.systemPrompts = [];
  });

  it("introduces the bot by the brand's bot term when there is a computer", async () => {
    await run([computerObserve]);
    expect(seen.systemPrompts).toHaveLength(1);
    expect(seen.systemPrompts[0]).toMatch(
      new RegExp(`^You are an? ${brand.bot.singular} with a real computer\\. `),
    );
  });

  it("introduces the bot by the brand's bot term when there is only a sandbox", async () => {
    await run([]);
    expect(seen.systemPrompts).toEqual([
      withUserFacingGuidance(
        `You are a ${brand.bot.singular} with a persistent sandbox filesystem and shell. Be concise.`,
      ),
    ]);
  });

  it("tells the bot to keep paths, folders and internal IDs from the user", async () => {
    for (const tools of [[computerObserve], []]) {
      seen.systemPrompts = [];
      await run(tools);
      expect(seen.systemPrompts[0]).toContain(
        "Never mention file system paths, folders, or internal IDs to the user.",
      );
    }
  });

  it("names the product, not the upstream, in the helper's prompt", async () => {
    await run(builtinAgentTools);
    const helper = seen.systemPrompts.find((prompt) => prompt.includes("subagent named"));
    expect(helper).toContain(`You are a ${brand.name} subagent named "scout".`);
    expect(helper).toContain(
      `Messages marked as automated come from ${brand.name}, not from the user.`,
    );
  });

  it("never says Rakazo in any of them", async () => {
    for (const tools of [[computerObserve], [], builtinAgentTools]) {
      seen.systemPrompts = [];
      await run(tools);
      expect(seen.systemPrompts.length).toBeGreaterThan(0);
      for (const prompt of seen.systemPrompts) expect(prompt).not.toMatch(/rakazo/i);
    }
  });
});
