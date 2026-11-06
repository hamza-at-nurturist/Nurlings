import { expect, test } from "vitest";
import { miniAppAttachName, miniAppProblem } from "./mini-app-check.js";

const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

test("a file that is not a mini app is never checked", () => {
  expect(miniAppProblem("report.json", bytes({ anything: true }))).toBeNull();
  expect(miniAppProblem("notes.txt", new TextEncoder().encode("hello"))).toBeNull();
});

test("a good mini app passes", () => {
  const app = { spec: { root: { type: "Heading", props: { text: "Hi" } } } };
  expect(miniAppProblem("hi.app.json", bytes(app))).toBeNull();
});

test("a broken mini app says what to fix", () => {
  const app = { spec: { root: { type: "Table", props: { columns: "no", rows: [] } } } };
  expect(miniAppProblem("bad.app.json", bytes(app))).toMatch(/Table/);
  expect(miniAppProblem("bad.app.json", new TextEncoder().encode("{nope"))).toMatch(
    /not valid JSON/,
  );
});

test("a friendly name on a mini app keeps the app suffix", () => {
  expect(miniAppAttachName("crm.app.json", "Demo CRM")).toBe("Demo CRM.app.json");
  expect(miniAppAttachName("crm.app.json", "Demo CRM.app.json")).toBe("Demo CRM.app.json");
  expect(miniAppAttachName("leads.json", "Leads")).toBe("Leads");
  expect(miniAppAttachName("crm.app.json", undefined)).toBeUndefined();
});
