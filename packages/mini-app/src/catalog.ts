import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";
import { ICON_NAMES } from "./icons.js";

/**
 * A prop is a literal or one of json-render's expression objects ($state, $item, $template, ...).
 * Expressions resolve before a component renders, and components draw whatever they get as plain
 * text, so data from outside tools never becomes markup.
 */
const expression = z.record(z.string(), z.unknown());
const text = z.union([z.string(), z.number(), expression]);
const gap = z.enum(["none", "sm", "md", "lg"]);
const toneName = z.enum(["neutral", "info", "success", "warning", "destructive", "muted"]);
/** A tone, or an expression that resolves to one, so a row's data can decide its color. */
const tone = z.union([toneName, expression]);
const icon = z.enum(ICON_NAMES);
const numbers = z.union([z.array(z.number()).max(120), expression]);
const format = z.enum(["number", "currency", "percent"]);
const currency = z.string().length(3);
const rows = z.union([z.array(z.record(z.string(), z.unknown())).max(500), expression]);

const components = {
  Stack: {
    props: z.object({
      direction: z.enum(["column", "row", "columns"]).nullish(),
      gap: gap.nullish(),
      align: z.enum(["start", "center", "end", "stretch"]).nullish(),
      justify: z.enum(["start", "between", "end"]).nullish(),
      wrap: z.boolean().nullish(),
      padding: z.enum(["none", "sm", "md", "lg"]).nullish(),
      border: z.enum(["bottom", "end", "top"]).nullish(),
      grow: z.boolean().nullish(),
      width: z.enum(["sm", "md", "lg"]).nullish(),
    }),
    description:
      "Lays out its children. grow lets it take the free space in a row or column; width gives it a fixed width (sm, md or lg) so columns of rows line up; border draws a hairline on one side. column stacks them, row puts them in a line (wrapping unless wrap is false), columns gives each child an equal share of the width (a board). align and justify place them; padding adds space inside.",
    slots: ["default"],
  },
  Grid: {
    props: z.object({
      columns: z.union([z.number().int().min(1).max(6), z.enum(["sidebar", "main-side"])]),
      gap: gap.nullish(),
      fill: z.boolean().nullish(),
    }),
    description:
      "A grid. fill makes it at least as tall as the screen. A number gives that many equal columns; sidebar is a narrow navigation column beside a wide one; main-side is a wide column beside a narrower one.",
    slots: ["default"],
  },
  Separator: {
    props: z.object({}),
    description: "A thin line between sections.",
  },
  Card: {
    props: z.object({ title: text.nullish(), flush: z.boolean().nullish() }),
    description:
      "A bordered box with an optional title. Use it for a board column or a deal. flush removes the inner padding, for a table or list that runs edge to edge.",
    slots: ["default"],
  },
  Heading: {
    props: z.object({ text, hint: text.nullish(), level: z.enum(["1", "2", "3"]).nullish() }),
    description:
      "A heading. level 1 is a page title, 2 a section (default), 3 a small one; hint is a lighter word beside it.",
  },
  Text: {
    props: z.object({
      text,
      tone: z.union([toneName, z.literal("default"), expression]).nullish(),
      variant: z.enum(["body", "small", "label", "mono", "title"]).nullish(),
      truncate: z.boolean().nullish(),
      align: z.enum(["left", "right"]).nullish(),
    }),
    description:
      "A line of plain text. variant: small, label (small capitals for a section label), mono (times and codes) or title. tone colors it.",
  },
  Icon: {
    props: z.object({
      name: icon,
      tone: tone.nullish(),
      size: z.enum(["sm", "md", "lg"]).nullish(),
    }),
    description: "A small icon from a fixed set.",
  },
  Avatar: {
    props: z.object({
      name: text,
      size: z.enum(["sm", "md", "lg"]).nullish(),
    }),
    description: "A round avatar showing the initials of a name.",
  },
  Badge: {
    props: z.object({ text, tone: tone.nullish(), shape: z.enum(["pill", "tag"]).nullish() }),
    description:
      "A small status label. shape tag is a squared, monospace, capitalised label for statuses such as FAILED or DEAL.",
  },
  Stat: {
    props: z.object({
      label: text,
      value: text,
      format: format.nullish(),
      currency: currency.nullish(),
      tone: tone.nullish(),
      hint: text.nullish(),
      spark: numbers.nullish(),
      delta: text.nullish(),
      deltaTone: tone.nullish(),
      sparkTone: tone.nullish(),
    }),
    description:
      "One big number with a short label. format shows it as a number, currency or percent; tone colors the number for a warning; hint is a small line under the label; spark is a list of recent numbers drawn as a tiny trend line; delta is a small change chip such as +12%.",
  },
  Table: {
    props: z.object({
      columns: z
        .array(
          z.object({
            key: z.string(),
            label: z.string(),
            format: z
              .enum([
                "text",
                "number",
                "currency",
                "percent",
                "badge",
                "tag",
                "stacked",
                "meter",
                "rating",
                "menu",
              ])
              .nullish(),
            align: z.enum(["left", "right"]).nullish(),
            tones: z.record(z.string(), toneName).nullish(),
            toneKey: z.string().nullish(),
            subKey: z.string().nullish(),
            max: z.number().positive().nullish(),
            mono: z.boolean().nullish(),
            truncate: z.boolean().nullish(),
          }),
        )
        .max(12),
      rows,
      currency: currency.nullish(),
      where: z.object({ key: z.string(), includes: text }).nullish(),
      search: z.object({ value: text, keys: z.array(z.string()).max(6) }).nullish(),
    }),
    description:
      "Rows of data. rows is usually a { $state: '/data/<file>' } expression. A column format of badge or tag draws the cell as a label colored by its tones map (cell text to tone) or by the row's toneKey field; stacked shows the cell over a lighter subKey line; meter draws n of max as a segmented bar; rating draws a thumb for 'up' or 'down'; menu draws a row menu icon; number, currency and percent right-align and show negatives in red. where keeps rows whose key field (a value or a list) includes the given value, unless it is 'all'; search keeps rows where any of the keys contains the typed text.",
  },
  Chart: {
    props: z.object({
      type: z.enum(["bar", "line", "area", "pie"]),
      data: rows,
      x: z.string(),
      y: z.union([z.string(), z.array(z.string()).min(1).max(4)]),
      title: text.nullish(),
      format: format.nullish(),
      currency: currency.nullish(),
    }),
    description:
      "A bar, line, area or pie chart. data is rows (usually a $state expression); x is the key for labels; y is the key for values, or a list of up to four keys to compare series (pie takes one). Single-series bars below zero draw in red.",
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
        .array(z.object({ id: z.string(), label: z.string(), count: text.nullish() }))
        .min(1)
        .max(8),
      value: text,
      variant: z.enum(["default", "line"]).nullish(),
    }),
    description:
      "Tab buttons. Bind value to a state path with { $bindState: '/ui/tab' } and set that path in the spec's state. A tab can show a count. Show each tab's content by giving its container a visible condition on the same path, such as { $state: '/ui/tab', eq: 'details' }. variant line draws an underline style.",
  },
  Meter: {
    props: z.object({
      value: text,
      max: text.nullish(),
      tone: tone.nullish(),
      label: text.nullish(),
      wide: z.boolean().nullish(),
    }),
    description:
      "A segmented bar showing value of max, one segment per step, such as 3 of 7. wide stretches it across its container.",
  },
  Breakdown: {
    props: z.object({
      segments: z.union([
        z.array(z.object({ label: z.string(), value: z.number(), tone: tone.nullish() })).max(12),
        expression,
      ]),
      title: text.nullish(),
    }),
    description:
      "A stacked bar split by share, with a legend of labels and counts below it. Use it for outcomes or sources.",
  },
  Message: {
    props: z.object({
      from: z.union([z.enum(["contact", "agent", "note"]), expression]),
      text,
      meta: text.nullish(),
      skipped: z.union([z.boolean(), expression]).nullish(),
      decision: z
        .union([
          z.object({
            tags: z
              .array(z.object({ text: z.string(), tone: tone.nullish() }))
              .max(6)
              .nullish(),
            text: z.string().nullish(),
            footer: z.string().nullish(),
            rating: z.enum(["up", "down"]).nullish(),
          }),
          expression,
        ])
        .nullish(),
    }),
    description:
      "A chat message. contact shows on the left, agent on the right in the strong color, note is a muted line. skipped draws it dashed. decision attaches a card under it with tags, a reason, a footer and an optional thumb.",
  },
  Diff: {
    props: z.object({
      parts: z.union([
        z.array(z.object({ text: z.string(), kind: z.enum(["same", "add", "del"]) })).max(400),
        expression,
      ]),
      title: text.nullish(),
    }),
    description:
      "A before and after text change: removed words struck out in red, added words in green.",
  },
  Input: {
    props: z.object({
      value: text,
      placeholder: text.nullish(),
      icon: icon.nullish(),
      hint: text.nullish(),
      width: z.enum(["sm", "md", "lg", "full"]).nullish(),
    }),
    description:
      "A text field. Bind value with { $bindState: '/ui/q' } to filter a Table's search or to keep a draft. icon shows at the start; hint shows a small key hint at the end.",
  },
  Textarea: {
    props: z.object({
      value: text,
      placeholder: text.nullish(),
      rows: z.number().int().min(2).max(12).nullish(),
    }),
    description: "A multi-line text field. Bind value with $bindState.",
  },
  Select: {
    props: z.object({
      value: text,
      options: z.union([
        z
          .array(z.object({ value: z.string(), label: z.string() }))
          .min(1)
          .max(30),
        expression,
      ]),
      placeholder: text.nullish(),
    }),
    description: "A dropdown of options. Bind value with $bindState.",
  },
  ToggleGroup: {
    props: z.object({
      items: z.union([
        z
          .array(z.object({ value: z.string(), label: z.string() }))
          .min(1)
          .max(12),
        expression,
      ]),
      value: text,
      multiple: z.boolean().nullish(),
    }),
    description:
      "A row of toggle chips. Bind value with $bindState; it holds the chosen value, or a list of values when multiple is true.",
  },
  Button: {
    props: z.object({
      label: text,
      variant: z
        .enum(["default", "secondary", "outline", "ghost", "destructive", "link"])
        .nullish(),
      size: z.enum(["sm", "md"]).nullish(),
      icon: icon.nullish(),
      hint: text.nullish(),
      count: text.nullish(),
      active: z.union([z.boolean(), expression]).nullish(),
      full: z.boolean().nullish(),
      align: z.enum(["start", "center"]).nullish(),
    }),
    description:
      "A button. Wire its press event to askBot or to setState (to switch a page or tab). variant, an icon at the start, a small key hint at the end, a count badge, and active (highlighted, for a navigation item) are optional; full stretches it and align start left-aligns its label.",
  },
};

const actions = {
  setState: {
    params: z.object({ statePath: z.string().regex(/^\/ui\//), value: z.unknown() }),
    description:
      "Sets a value in the app's own interface state, under /ui. Use it for navigation and filters.",
  },
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
 * actions and their params. It returns the first problem, or null when the file is clean.
 */
export function catalogProblem(spec: {
  elements: Record<string, { type: string; props?: unknown; on?: unknown }>;
}): string | null {
  for (const [id, element] of Object.entries(spec.elements)) {
    const component = (components as Record<string, { props: z.ZodType }>)[element.type];
    if (!component) return `${id}: unknown component ${element.type}`;
    const checked = component.props.safeParse(element.props ?? {});
    if (!checked.success) {
      const issue = checked.error.issues[0];
      return `${id} (${element.type}): ${issue?.path.join(".") ?? ""} ${issue?.message ?? "invalid"}`;
    }
    const bindings = Object.values((element.on ?? {}) as Record<string, Binding | Binding[]>);
    for (const binding of bindings.flat()) {
      const action = (actions as Record<string, { params: z.ZodType }>)[String(binding.action)];
      if (!action) return `${id}: unknown action ${String(binding.action)}`;
      if (!action.params.safeParse(binding.params ?? {}).success) {
        return `${id}: bad params for action ${String(binding.action)}`;
      }
    }
  }
  return null;
}

export function usesOnlyTheCatalog(spec: Parameters<typeof catalogProblem>[0]): boolean {
  return catalogProblem(spec) === null;
}
