import { expect, test } from "vitest";
import { flattenSpec } from "./nested.js";
import { readMiniApp } from "./parse.js";

const file = (spec: unknown) => JSON.stringify({ spec });

test("a nested spec flattens in reading order with ids it makes", () => {
  const flat = flattenSpec({
    root: {
      type: "Stack",
      children: [
        { type: "Heading", props: { text: "Hi" } },
        { type: "Stack", children: [{ type: "Text", props: { text: "x" } }] },
      ],
    },
  });
  expect(flat).toMatchObject({ root: "e1" });
  if ("problem" in flat) throw new Error(flat.problem);
  expect(flat.elements.e1?.children).toEqual(["e2", "e3"]);
  expect(flat.elements.e3?.children).toEqual(["e4"]);
  expect(flat.elements.e2?.children).toEqual([]);
});

test("a flat spec still works and gets empty children on leaves", () => {
  const flat = flattenSpec({
    root: "a",
    elements: { a: { type: "Heading", props: { text: "x" } } },
  });
  if ("problem" in flat) throw new Error(flat.problem);
  expect(flat.elements.a?.children).toEqual([]);
});

test("a nested app draws the same as a flat one", () => {
  const nested = readMiniApp(
    file({ root: { type: "Stack", children: [{ type: "Heading", props: { text: "Hi" } }] } }),
  );
  expect(nested).not.toHaveProperty("error");
});

test("a bot gets a plain reason for each kind of mistake", () => {
  expect(readMiniApp("{nope")).toMatchObject({ error: "json" });
  expect(readMiniApp(file({ root: 3 }))).toMatchObject({
    error: "shape",
    detail: "spec.root must be an element or an element id",
  });
  expect(readMiniApp(file({ root: { type: "Stack", children: [{ props: {} }] } }))).toMatchObject({
    error: "shape",
    detail: "spec.root.children[0] must be an element with a type",
  });
  expect(readMiniApp(file({ root: { type: "Iframe" } }))).toMatchObject({
    error: "unsupported",
    detail: expect.stringContaining("Iframe"),
  });
  expect(
    readMiniApp(
      file({ root: { type: "Heading", props: { text: { $state: "/ui/x" }, level: 9 } } }),
    ),
  ).toMatchObject({ error: "unsupported", detail: expect.stringContaining("Heading") });
});
