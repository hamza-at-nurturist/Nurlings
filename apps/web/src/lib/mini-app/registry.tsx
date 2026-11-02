import { defineRegistry, useBoundProp } from "@json-render/react";
import { Alert, AlertDescription, AlertTitle } from "@rakazo/ui-web/components/ui/alert";
import { Badge } from "@rakazo/ui-web/components/ui/badge";
import { Button } from "@rakazo/ui-web/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@rakazo/ui-web/components/ui/progress";
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

type Tone = "neutral" | "success" | "warning" | "destructive";

const GAPS = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;

const TEXT_TONES: Record<Tone, string> = {
  neutral: "",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const PROGRESS_TONES: Record<Tone, string> = {
  neutral: "",
  success: "[&_[data-slot=progress-indicator]]:bg-success",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
  destructive: "[&_[data-slot=progress-indicator]]:bg-destructive",
};

const BADGE_TONES: Record<Tone, string> = {
  neutral: "",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "",
};

const CALLOUT_TONES: Record<Tone, string> = {
  neutral: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  destructive: "border-l-destructive",
};

function StatusBadge({ text, tone }: { text: string; tone: Tone }) {
  return (
    <Badge
      variant={tone === "destructive" ? "destructive" : "secondary"}
      className={BADGE_TONES[tone]}
    >
      {text}
    </Badge>
  );
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
          props.direction === "row" && "flex flex-wrap items-start",
          props.direction === "columns" && "grid auto-cols-fr grid-flow-col overflow-x-auto",
          (props.direction ?? "column") === "column" && "flex flex-col",
        )}
      >
        {children}
      </div>
    ),
    Card: ({ props, children }) => (
      <div className="flex min-w-48 flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground">
        {asText(props.title) ? (
          <div className="text-sm font-medium">{asText(props.title)}</div>
        ) : null}
        {children}
      </div>
    ),
    Heading: ({ props }) => <h2 className="text-base font-semibold">{asText(props.text)}</h2>,
    Text: ({ props }) => (
      <p className={cn("text-sm", props.tone === "muted" && "text-muted-foreground")}>
        {asText(props.text)}
      </p>
    ),
    Badge: ({ props }) => <StatusBadge text={asText(props.text)} tone={props.tone ?? "neutral"} />,
    Stat: ({ props }) => (
      <div className="flex min-w-36 flex-col rounded-lg border bg-card p-4">
        <span
          className={cn("text-2xl font-semibold tabular-nums", TEXT_TONES[props.tone ?? "neutral"])}
        >
          {formatValue(props.value, props.format, props.currency)}
        </span>
        <span className="text-sm text-muted-foreground">{asText(props.label)}</span>
        {asText(props.hint) ? (
          <span className="mt-1 text-xs text-muted-foreground">{asText(props.hint)}</span>
        ) : null}
      </div>
    ),
    Table: ({ props }) => {
      const rows = Array.isArray(props.rows) ? props.rows : [];
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {props.columns.map((column) => (
                <TableHead key={column.key} className={cn(isRight(column) && "text-right")}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                {props.columns.map((column) => {
                  const value = (row as Record<string, unknown>)[column.key];
                  const kind = column.format ?? "text";
                  if (kind === "badge") {
                    const label = asText(value);
                    return (
                      <TableCell key={column.key} className={cn(isRight(column) && "text-right")}>
                        {label ? (
                          <StatusBadge text={label} tone={column.tones?.[label] ?? "neutral"} />
                        ) : null}
                      </TableCell>
                    );
                  }
                  const numeric = kind !== "text";
                  const number = numeric ? toNumber(value) : null;
                  return (
                    <TableCell
                      key={column.key}
                      className={cn(
                        isRight(column) && "text-right",
                        numeric && "tabular-nums",
                        number !== null && number < 0 && "text-destructive",
                      )}
                    >
                      {numeric ? formatValue(value, kind, props.currency) : asText(value)}
                    </TableCell>
                  );
                })}
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
      <Alert role="note" className={cn("border-l-4", CALLOUT_TONES[props.tone ?? "neutral"])}>
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
            PROGRESS_TONES[props.tone ?? "neutral"],
          )}
        >
          <ProgressLabel>{asText(props.label)}</ProgressLabel>
          <ProgressValue />
        </Progress>
      );
    },
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
    Tabs: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp<string>(
        typeof props.value === "string" ? props.value : undefined,
        bindings?.value,
      );
      const current = props.tabs.some((tab) => tab.id === value) ? value : props.tabs[0]?.id;
      return (
        <TabsRoot value={current} onValueChange={(next) => setValue(String(next))}>
          <TabsList>
            {props.tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </TabsRoot>
      );
    },
    Button: ({ props, emit }) => (
      <Button variant="outline" size="sm" onClick={() => emit("press")}>
        {asText(props.label)}
      </Button>
    ),
  },
  actions: {
    // The real handler is supplied by the viewer, which knows the bot.
    askBot: async () => {},
  },
});

function isRight(column: { align?: "left" | "right" | null; format?: string | null }): boolean {
  return (
    column.align === "right" ||
    (!column.align && ["number", "currency", "percent"].includes(column.format ?? ""))
  );
}
