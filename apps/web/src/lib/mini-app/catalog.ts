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
const tone = z.enum(["neutral", "success", "warning", "destructive"]);
const format = z.enum(["number", "currency", "percent"]);
const currency = z.string().length(3);
const rows = z.union([z.array(z.record(z.string(), z.unknown())).max(500), expression]);

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
    props: z.object({ text, tone: tone.nullish() }),
    description: "A small status label.",
  },
  Stat: {
    props: z.object({
      label: text,
      value: text,
      format: format.nullish(),
      currency: currency.nullish(),
      tone: tone.nullish(),
      hint: text.nullish(),
    }),
    description:
      "One big number with a short label. format shows it as a number, currency or percent; tone colors the number for a warning; hint is a small line under the label.",
  },
  Table: {
    props: z.object({
      columns: z
        .array(
          z.object({
            key: z.string(),
            label: z.string(),
            format: z.enum(["text", "number", "currency", "percent", "badge"]).nullish(),
            align: z.enum(["left", "right"]).nullish(),
            tones: z.record(z.string(), tone).nullish(),
          }),
        )
        .max(12),
      rows,
      currency: currency.nullish(),
    }),
    description:
      "Rows of data. rows is usually a { $state: '/data/<file>' } expression. A column format of badge draws the cell as a label colored by its tones map (cell text to tone); number, currency and percent right-align and show negatives in red.",
  },
  Chart: {
    props: z.object({
      type: z.enum(["bar", "line"]),
      data: rows,
      x: z.string(),
      y: z.string(),
      title: text.nullish(),
      format: format.nullish(),
      currency: currency.nullish(),
    }),
    description:
      "A bar or line chart. data is rows (usually a $state expression); x is the key for labels and y the key for values. Bars below zero draw in red.",
  },
  Callout: {
    props: z.object({ text, title: text.nullish(), tone: tone.nullish() }),
    description:
      "A highlighted note with an optional title. Use it for a warning or an assumption.",
  },
  Progress: {
    props: z.object({
      label: text,
      value: text,
      max: text.nullish(),
      tone: tone.nullish(),
    }),
    description: "A progress bar with a label. value out of max (100 when missing).",
  },
  KeyValue: {
    props: z.object({
      items: z
        .array(z.object({ label: z.string(), value: text, format: format.nullish() }))
        .max(30),
      currency: currency.nullish(),
    }),
    description:
      "A list of label and value pairs, like the facts of a deal. An item's format shows its value as a number, currency or percent.",
  },
  Tabs: {
    props: z.object({
      tabs: z
        .array(z.object({ id: z.string(), label: z.string() }))
        .min(1)
        .max(8),
      value: text,
    }),
    description:
      "Tab buttons. Bind value to a state path with { $bindState: '/ui/tab' } and set that path in the spec's state. Show each tab's content by giving its container a visible condition on the same path, such as { $state: '/ui/tab', eq: 'details' }.",
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
