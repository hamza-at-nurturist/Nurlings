import { expect, it } from "vitest";
import { toolCalledPayload } from "./run-turn.js";

it("stamps the avatar category on mapped built-in tools only", () => {
  expect(toolCalledPayload("write_file", "e1")).toEqual({
    name: "write_file",
    executionId: "e1",
    tool: "write",
  });
  expect(toolCalledPayload("web_search", "e2").tool).toBe("search");
  expect(toolCalledPayload("browser_act", "e3").tool).toBe("computer");
  expect(toolCalledPayload("mcp__crm__lookup", "e4")).toEqual({
    name: "mcp__crm__lookup",
    executionId: "e4",
  });
});
