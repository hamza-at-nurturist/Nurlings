import { readMiniApp } from "@rakazo/mini-app";
import { expect, test } from "vitest";
import { NURLINGS_SKILLS } from "./nurlings-skills.js";

const JSON_BLOCK = /```json\n([\s\S]*?)\n```/g;

test("every mini app example in a skill is a file the app accepts", () => {
  let checked = 0;
  for (const skill of NURLINGS_SKILLS) {
    for (const match of skill.body.matchAll(JSON_BLOCK)) {
      const read = readMiniApp(match[1] ?? "");
      expect(read, `${skill.name}: ${"detail" in read ? read.detail : ""}`).not.toHaveProperty(
        "error",
      );
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThanOrEqual(2);
});

test("the templates skill is listed separately from Apps", () => {
  expect(NURLINGS_SKILLS.map((skill) => skill.name)).toEqual(["Apps", "App templates"]);
});
