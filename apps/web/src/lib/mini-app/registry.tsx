import { defineRegistry, useBoundProp } from "@json-render/react";
import { Alert, AlertDescription, AlertTitle } from "@rakazo/ui-web/components/ui/alert";
import { Progress, ProgressLabel, ProgressValue } from "@rakazo/ui-web/components/ui/progress";
import { Separator } from "@rakazo/ui-web/components/ui/separator";
import { Skeleton } from "@rakazo/ui-web/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rakazo/ui-web/components/ui/table";
import { TabsList, Tabs as TabsRoot, TabsTrigger } from "@rakazo/ui-web/components/ui/tabs";
import { cn } from "@rakazo/ui-web/lib/utils";
import { lazy, Suspense } from "react";
import { miniAppCatalog } from "./catalog";
import { asText, formatValue, toNumber, type ValueFormat } from "./format";
import type { ChartPoint, ChartType } from "./mini-chart";
import {
  ActionButton,
  AreaField,
  BreakdownBar,
  ChipsField,
  DiffView,
  filterRows,
  Initials,
  isRight,
  MessageView,
  MeterBar,
  MiniIcon,
  SelectField,
  Sparkline,
  StatusBadge,
  TableCell_,
  TEXT_TONES,
  TextField,
  type Tone,
  toTone,
} from "./parts";

const GAPS = { none: "gap-0", sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;
const STACK_WIDTHS = { sm: "w-24 shrink-0", md: "w-36 shrink-0", lg: "w-56 shrink-0" } as const;
const PADDINGS = { none: "", sm: "p-2", md: "p-4", lg: "p-6" } as const;
const ALIGNS = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;
const JUSTIFIES = { start: "", between: "justify-between", end: "justify-end" } as const;
const GRIDS = {
  sidebar: "grid-cols-[15rem_minmax(0,1fr)]",
  "main-side": "grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]",
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
} as const;

const PROGRESS_TONES: Record<Tone, string> = {
  neutral: "",
  info: "[&_[data-slot=progress-indicator]]:bg-link",
  success: "[&_[data-slot=progress-indicator]]:bg-success",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
  destructive: "[&_[data-slot=progress-indicator]]:bg-destructive",
  muted: "[&_[data-slot=progress-indicator]]:bg-muted-foreground",
};

const CALLOUT_TONES: Record<Tone, string> = {
  neutral: "border-l-primary",
  info: "border-l-link",
  success: "border-l-success",
  warning: "border-l-warning",
  destructive: "border-l-destructive",
  muted: "border-l-muted-foreground",
};

const TEXT_VARIANTS = {
  body: "text-sm",
  small: "text-xs",
  label: "text-xs font-medium tracking-wide uppercase",
  mono: "font-mono text-xs tabular-nums",
  title: "text-lg font-semibold",
} as const;

const HEADINGS = {
  "1": "text-xl font-semibold",
  "2": "text-base font-semibold",
  "3": "text-sm font-semibold",
} as const;

/** Options from a literal list or from data; anything that is not a list of value and label is none. */
function optionList(value: unknown): { value: string; label: string }[] {
  return (Array.isArray(value) ? value : []).flatMap((entry) => {
    const record = (entry ?? {}) as Record<string, unknown>;
    return typeof record.value === "string" && typeof record.label === "string"
      ? [{ value: record.value, label: record.label }]
      : [];
  });
}

function toFrom(value: unknown): "contact" | "agent" | "note" {
  return value === "agent" || value === "note" ? value : "contact";
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

const CHART_MAX_POINTS = 120;

/** Recharts is large and most apps have no chart, so it loads only when one is drawn. */
const MiniChartPlot = lazy(() =>
  import("./mini-chart").then((module) => ({ default: module.MiniChartPlot })),
);

function ChartFigure({
  type,
  rows,
  x,
  y,
  title,
  format,
  currency,
}: {
  type: ChartType;
  rows: unknown[];
  x: string;
  y: string | string[];
  title: string;
  format?: ValueFormat | null;
  currency?: string | null;
}) {
  const series = (Array.isArray(y) ? y : [y]).slice(0, 4);
  const points: ChartPoint[] = rows.slice(0, CHART_MAX_POINTS).flatMap((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    const values = series.map((key) => toNumber(record[key]));
    return values.every((value) => value === null) ? [] : [{ x: asText(record[x]), values }];
  });
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;

  const show = (value: number | null) => formatValue(value, format ?? "number", currency);
  const latest = last.values[0] ?? null;
  const description = `${title ? `${title}: ` : ""}${first.x} ${show(first.values[0] ?? null)} to ${last.x} ${show(latest)}`;

  return (
    <figure
      role="img"
      aria-label={description}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">{title}</span>
        {type !== "pie" ? (
          <span
            className={cn(
              "text-sm tabular-nums",
              latest !== null && latest < 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {show(latest)}
          </span>
        ) : null}
      </figcaption>
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <MiniChartPlot
          type={type}
          points={points}
          series={series}
          format={format}
          currency={currency}
        />
      </Suspense>
    </figure>
  );
}

export const { registry } = defineRegistry(miniAppCatalog, {
  components: {
    Stack: ({ props, children }) => (
      <div
        className={cn(
          GAPS[props.gap ?? "md"],
          PADDINGS[props.padding ?? "none"],
          ALIGNS[props.align ?? (props.direction === "row" ? "center" : "stretch")],
          JUSTIFIES[props.justify ?? "start"],
          props.grow && "min-w-0 flex-1",
          props.width && STACK_WIDTHS[props.width],
          props.border === "bottom" && "border-b",
          props.border === "top" && "border-t",
          props.border === "end" && "border-r",
          props.direction === "row" && cn("flex flex-row", props.wrap !== false && "flex-wrap"),
          props.direction === "columns" && "grid auto-cols-fr grid-flow-col overflow-x-auto",
          (props.direction ?? "column") === "column" && "flex flex-col",
        )}
      >
        {children}
      </div>
    ),
    Grid: ({ props, children }) => (
      <div
        className={cn(
          "grid",
          GAPS[props.gap ?? "md"],
          props.fill && "min-h-full",
          (GRIDS as Record<string, string>)[String(props.columns)],
        )}
      >
        {children}
      </div>
    ),
    Separator: () => <Separator />,
    Card: ({ props, children }) => (
      <div
        className={cn(
          "flex min-w-48 flex-col rounded-lg border bg-card text-card-foreground",
          props.flush ? "gap-0 overflow-hidden" : "gap-2 p-3",
        )}
      >
        {asText(props.title) ? (
          <div className={cn("text-sm font-medium", props.flush && "px-4 pt-3 pb-2")}>
            {asText(props.title)}
          </div>
        ) : null}
        {children}
      </div>
    ),
    Heading: ({ props }) => (
      <h2 className={cn("flex items-baseline gap-2", HEADINGS[props.level ?? "2"])}>
        {asText(props.text)}
        {asText(props.hint) ? (
          <span className="text-sm font-normal text-muted-foreground">{asText(props.hint)}</span>
        ) : null}
      </h2>
    ),
    Text: ({ props }) => (
      <p
        className={cn(
          TEXT_VARIANTS[props.variant ?? "body"],
          props.tone === "default" || !props.tone ? "" : TEXT_TONES[toTone(props.tone, "neutral")],
          props.truncate && "truncate",
          props.align === "right" && "text-right",
        )}
      >
        {asText(props.text)}
      </p>
    ),
    Icon: ({ props }) => <MiniIcon name={props.name} tone={toTone(props.tone)} size={props.size} />,
    Avatar: ({ props }) => <Initials name={asText(props.name)} size={props.size} />,
    Badge: ({ props }) => (
      <StatusBadge text={asText(props.text)} tone={toTone(props.tone)} shape={props.shape} />
    ),
    Stat: ({ props }) => {
      const spark = Array.isArray(props.spark)
        ? props.spark.filter((n) => typeof n === "number")
        : [];
      return (
        <div className="flex min-w-36 items-end justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{asText(props.label)}</span>
            <span className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-3xl font-semibold tabular-nums",
                  TEXT_TONES[toTone(props.tone)],
                )}
              >
                {formatValue(props.value, props.format, props.currency)}
              </span>
              {asText(props.delta) ? (
                <span className={cn("text-xs", TEXT_TONES[toTone(props.deltaTone, "success")])}>
                  {asText(props.delta)}
                </span>
              ) : null}
            </span>
            {asText(props.hint) ? (
              <span className="mt-1 text-xs text-muted-foreground">{asText(props.hint)}</span>
            ) : null}
          </div>
          {spark.length > 1 ? (
            <Sparkline values={spark} tone={toTone(props.sparkTone, toTone(props.tone, "info"))} />
          ) : null}
        </div>
      );
    },
    Table: ({ props }) => {
      const rows = filterRows(asRows(props.rows), props.where, props.search);
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {props.columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    isRight(column) && "text-right",
                    "text-xs font-medium tracking-wide text-muted-foreground uppercase",
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                {props.columns.map((column) => (
                  <TableCell key={column.key} className={cn(isRight(column) && "text-right")}>
                    <TableCell_ column={column} row={row} currency={props.currency} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    },
    Chart: ({ props }) => (
      <ChartFigure
        type={props.type}
        rows={Array.isArray(props.data) ? props.data : []}
        x={props.x}
        y={props.y}
        title={asText(props.title)}
        format={props.format}
        currency={props.currency}
      />
    ),
    Callout: ({ props }) => (
      <Alert role="note" className={cn("border-l-4", CALLOUT_TONES[toTone(props.tone)])}>
        {asText(props.title) ? <AlertTitle>{asText(props.title)}</AlertTitle> : null}
        <AlertDescription>{asText(props.text)}</AlertDescription>
      </Alert>
    ),
    Progress: ({ props }) => {
      const max = toNumber(props.max) || 100;
      const percent = Math.min(100, Math.max(0, ((toNumber(props.value) ?? 0) / max) * 100));
      return (
        <Progress
          value={percent}
          className={cn(
            "min-w-56 flex-1 gap-2 self-center [&_[data-slot=progress-track]]:h-2",
            PROGRESS_TONES[toTone(props.tone)],
          )}
        >
          <ProgressLabel>{asText(props.label)}</ProgressLabel>
          <ProgressValue />
        </Progress>
      );
    },
    Meter: ({ props }) => (
      <MeterBar
        value={toNumber(props.value) ?? 0}
        max={toNumber(props.max) ?? 7}
        tone={toTone(props.tone, "info")}
        label={asText(props.label)}
        wide={props.wide}
      />
    ),
    Breakdown: ({ props }) => (
      <BreakdownBar
        segments={(Array.isArray(props.segments) ? props.segments : []).map((segment) => ({
          label: asText(segment.label),
          value: toNumber(segment.value) ?? 0,
          tone: toTone(segment.tone),
        }))}
        title={asText(props.title)}
      />
    ),
    Message: ({ props }) => {
      const decision =
        props.decision && typeof props.decision === "object" && !Array.isArray(props.decision)
          ? (props.decision as Record<string, unknown>)
          : null;
      return (
        <MessageView
          from={toFrom(props.from)}
          text={asText(props.text)}
          meta={asText(props.meta)}
          skipped={props.skipped === true}
          decision={
            decision && ("tags" in decision || "text" in decision || "footer" in decision)
              ? (decision as never)
              : null
          }
        />
      );
    },
    Diff: ({ props }) => (
      <DiffView
        parts={(Array.isArray(props.parts) ? props.parts : []).map((part) => ({
          text: asText(part.text),
          kind: part.kind,
        }))}
        title={asText(props.title)}
      />
    ),
    KeyValue: ({ props }) => (
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border bg-card p-4 text-sm">
        {props.items.map((item) => (
          <div key={item.label} className="contents">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="text-right font-medium tabular-nums">
              {formatValue(item.value, item.format, props.currency)}
            </dd>
          </div>
        ))}
      </dl>
    ),
    Input: ({ props, bindings }) => (
      <TextField
        value={props.value}
        bound={bindings?.value}
        placeholder={asText(props.placeholder)}
        icon={props.icon}
        hint={asText(props.hint)}
        width={props.width}
      />
    ),
    Textarea: ({ props, bindings }) => (
      <AreaField
        value={props.value}
        bound={bindings?.value}
        placeholder={asText(props.placeholder)}
        rows={props.rows}
      />
    ),
    Select: ({ props, bindings }) => (
      <SelectField
        value={props.value}
        bound={bindings?.value}
        options={optionList(props.options)}
        placeholder={asText(props.placeholder)}
      />
    ),
    ToggleGroup: ({ props, bindings }) => (
      <ChipsField
        value={props.value}
        bound={bindings?.value}
        items={optionList(props.items)}
        multiple={props.multiple}
      />
    ),
    Tabs: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp<string>(
        typeof props.value === "string" ? props.value : undefined,
        bindings?.value,
      );
      const current = props.tabs.some((tab) => tab.id === value) ? value : props.tabs[0]?.id;
      return (
        <TabsRoot value={current} onValueChange={(next) => setValue(String(next))}>
          <TabsList variant={props.variant === "line" ? "line" : "default"}>
            {props.tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
                {asText(tab.count) ? (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[11px] leading-4 text-muted-foreground tabular-nums">
                    {asText(tab.count)}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </TabsRoot>
      );
    },
    Button: ({ props, emit }) => (
      <ActionButton
        label={asText(props.label)}
        variant={props.variant}
        size={props.size}
        icon={props.icon}
        hint={asText(props.hint)}
        count={asText(props.count)}
        active={props.active === true}
        full={props.full}
        align={props.align}
        onPress={() => emit("press")}
      />
    ),
  },
  actions: {
    // The real handlers are supplied by the viewer (askBot) or built into the renderer (setState).
    askBot: async () => {},
    setState: async () => {},
  },
});
