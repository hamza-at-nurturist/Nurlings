import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * A prop is a literal or one of json-render's expression objects ($state, $item, $template, ...).
 * Expressions resolve before a component renders, and components draw whatever they get as plain
 * text, so data from outside tools never becomes markup.
 */
const expression = z.record(z.string(), z.unknown());
const text = z.union([z.string(), z.number(), expression]);
const gap = z.enum(["sm", "md", "lg"]);

const components = {
  Stack: {
    props: z.object({
      direction: z.enum(["column", "row", "columns"]).nullish(),
      gap: gap.nullish(),
    }),
    description:
      "Lays out its children. column stacks them, row wraps them in a line, columns gives each child an equal share of the width (a board).",
    slots: ["default"],
  },
  Card: {
    props: z.object({ title: text.nullish() }),
    description: "A bordered box with an optional title. Use it for a board column or a deal.",
    slots: ["default"],
  },
  Heading: {
    props: z.object({ text }),
    description: "A section heading.",
  },
  Text: {
    props: z.object({ text, tone: z.enum(["default", "muted"]).nullish() }),
    description: "A line of plain text.",
  },
  Badge: {
    props: z.object({
      text,
      tone: z.enum(["neutral", "success", "warning", "destructive"]).nullish(),
    }),
    description: "A small status label.",
  },
  Stat: {
    props: z.object({ label: text, value: text }),
    description: "One big number with a short label.",
  },
  Table: {
    props: z.object({
      columns: z.array(z.object({ key: z.string(), label: z.string() })).max(12),
      rows: z.union([z.array(z.record(z.string(), z.unknown())), expression]),
    }),
    description: "Rows of data. rows is usually a { $state: '/data/<file>' } expression.",
  },
  Button: {
    props: z.object({ label: text }),
    description: "A button. Wire its press event to the askBot action.",
  },
};

const actions = {
  askBot: {
    params: z.object({ message: text }),
    description:
      "Puts the message in this bot's chat composer and opens the chat. The person still has to press Send.",
  },
};

export const miniAppCatalog = defineCatalog(schema, { components, actions });

type Binding = { action?: unknown; params?: unknown };

/**
 * json-render's own validation only checks that component types exist. This checks the rest: every
 * element's props against its component's schema, and every action binding against the catalog's
 * actions and their params. A file that fails is refused whole.
 */
export function usesOnlyTheCatalog(spec: {
  elements: Record<string, { type: string; props?: unknown; on?: unknown }>;
}): boolean {
  for (const element of Object.values(spec.elements)) {
    const component = (components as Record<string, { props: z.ZodType }>)[element.type];
    if (!component?.props.safeParse(element.props ?? {}).success) return false;
    const bindings = Object.values((element.on ?? {}) as Record<string, Binding | Binding[]>);
    for (const binding of bindings.flat()) {
      const action = (actions as Record<string, { params: z.ZodType }>)[String(binding.action)];
      if (!action?.params.safeParse(binding.params ?? {}).success) return false;
    }
  }
  return true;
}
