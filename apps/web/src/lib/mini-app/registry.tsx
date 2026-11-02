import { defineRegistry, useBoundProp } from "@json-render/react";
import { Badge } from "@rakazo/ui-web/components/ui/badge";
import { Button } from "@rakazo/ui-web/components/ui/button";
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
import { miniAppCatalog } from "./catalog";
import { asText, formatValue, toNumber, type ValueFormat } from "./format";

type Tone = "neutral" | "success" | "warning" | "destructive";

const GAPS = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;

const TEXT_TONES: Record<Tone, string> = {
  neutral: "",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const FILL_TONES: Record<Tone, string> = {
  neutral: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
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

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const CHART_PADDING = 8;
const CHART_MAX_POINTS = 120;

function MiniChart({
  type,
  rows,
  x,
  y,
  title,
  format,
  currency,
}: {
  type: "bar" | "line";
  rows: unknown[];
  x: string;
  y: string;
  title: string;
  format?: ValueFormat | null;
  currency?: string | null;
}) {
  const points = rows.slice(0, CHART_MAX_POINTS).flatMap((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    const value = toNumber(record[y]);
    return value === null ? [] : [{ label: asText(record[x]), value }];
  });
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;

  const show = (value: number) => formatValue(value, format ?? "number", currency);
  const values = points.map((point) => point.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values) === min ? min + 1 : Math.max(0, ...values);
  const scale = (value: number) =>
    CHART_PADDING + (1 - (value - min) / (max - min)) * (CHART_HEIGHT - 2 * CHART_PADDING);
  const zero = scale(0);
  const step = CHART_WIDTH / points.length;
  const description = `${title ? `${title}: ` : ""}${first.label} ${show(first.value)} to ${last.label} ${show(last.value)}`;

  return (
    <figure className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">{title}</span>
        <span
          className={cn(
            "text-sm tabular-nums",
            last.value < 0 ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {show(last.value)}
        </span>
      </figcaption>
      <svg
        role="img"
        aria-label={description}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
      >
        <line
          x1={0}
          x2={CHART_WIDTH}
          y1={zero}
          y2={zero}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
          className="stroke-border"
        />
        {type === "bar" ? (
          points.map((point, index) => {
            const width = Math.max(2, step * 0.7);
            const top = scale(point.value);
            return (
              <rect
                key={index}
                x={index * step + (step - width) / 2}
                y={Math.min(top, zero)}
                width={width}
                height={Math.max(1, Math.abs(top - zero))}
                rx={2}
                className={point.value < 0 ? "fill-destructive" : "fill-primary"}
              >
                <title>{`${point.label}: ${show(point.value)}`}</title>
              </rect>
            );
          })
        ) : (
          <>
            <polyline
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-primary"
              points={points
                .map((point, index) => `${index * step + step / 2},${scale(point.value)}`)
                .join(" ")}
            />
            {points.map((point, index) => (
              <rect
                key={index}
                x={index * step}
                y={0}
                width={step}
                height={CHART_HEIGHT}
                fill="transparent"
              >
                <title>{`${point.label}: ${show(point.value)}`}</title>
              </rect>
            ))}
          </>
        )}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{first.label}</span>
        <span>{last.label}</span>
      </div>
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
      <MiniChart
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
      <div
        role="note"
        className={cn(
          "flex flex-col gap-1 rounded-lg border border-l-4 bg-card p-3 text-sm",
          CALLOUT_TONES[props.tone ?? "neutral"],
        )}
      >
        {asText(props.title) ? <span className="font-medium">{asText(props.title)}</span> : null}
        <span className="text-muted-foreground">{asText(props.text)}</span>
      </div>
    ),
    Progress: ({ props }) => {
      const max = toNumber(props.max) || 100;
      const percent = Math.min(100, Math.max(0, ((toNumber(props.value) ?? 0) / max) * 100));
      const label = asText(props.label);
      return (
        <div className="flex min-w-56 flex-1 flex-col gap-1.5 self-center">
          <div className="flex justify-between gap-4 text-sm">
            <span>{label}</span>
            <span className="text-muted-foreground tabular-nums">{Math.round(percent)}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn("h-full rounded-full", FILL_TONES[props.tone ?? "neutral"])}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
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
