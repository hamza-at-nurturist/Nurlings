import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@rakazo/ui-web/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatValue, type ValueFormat } from "./format";

export type ChartType = "bar" | "line" | "area" | "pie";
export type ChartPoint = { x: string; values: (number | null)[] };

/** Shades of the app's ink, so a chart stays monochrome and keeps working in light and dark. */
const SERIES_COLORS = [
  "var(--primary)",
  "color-mix(in srgb, var(--primary) 60%, transparent)",
  "color-mix(in srgb, var(--primary) 38%, transparent)",
  "color-mix(in srgb, var(--primary) 22%, transparent)",
];
const SLICE_COLORS = [100, 78, 60, 46, 34, 25, 18, 12].map((percent) =>
  percent === 100
    ? "var(--primary)"
    : `color-mix(in srgb, var(--primary) ${percent}%, transparent)`,
);

/**
 * Series are drawn under the ids s0, s1, ... and never under a name from the app file, because the
 * chart library turns series ids into CSS variable names.
 */
const seriesId = (index: number) => `s${index}`;

export function MiniChartPlot({
  type,
  points,
  series,
  format,
  currency,
}: {
  type: ChartType;
  points: ChartPoint[];
  series: string[];
  format?: ValueFormat | null;
  currency?: string | null;
}) {
  const show = (value: unknown) => formatValue(value, format ?? "number", currency);
  const config: ChartConfig = Object.fromEntries(
    series.map((label, index) => [
      seriesId(index),
      { label, color: SERIES_COLORS[index % SERIES_COLORS.length] },
    ]),
  );
  const data: Array<Record<string, string | number | null>> = points.map((point) => ({
    x: point.x,
    ...Object.fromEntries(series.map((_, index) => [seriesId(index), point.values[index] ?? null])),
  }));
  const tooltip = (
    <ChartTooltip
      cursor={type === "bar" ? { fill: "var(--muted)", opacity: 0.4 } : undefined}
      content={
        <ChartTooltipContent
          formatter={(value, name) => (
            <div className="flex w-full items-center justify-between gap-4">
              <span className="text-muted-foreground">{config[String(name)]?.label ?? name}</span>
              <span className="font-medium tabular-nums">{show(value)}</span>
            </div>
          )}
        />
      }
    />
  );
  const axis = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="x"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={24}
        interval="preserveStartEnd"
      />
      <YAxis
        width={48}
        tickLine={false}
        axisLine={false}
        tickMargin={4}
        tickFormatter={(value) => formatCompact(value, format ?? "number", currency)}
      />
      <ReferenceLine y={0} className="stroke-border" strokeDasharray="4 4" />
    </>
  );
  const legend = series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null;

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      {type === "pie" ? (
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium tabular-nums">{show(value)}</span>
                  </div>
                )}
              />
            }
          />
          <Pie
            isAnimationActive={false}
            data={data.filter((row) => Number(row.s0) > 0)}
            dataKey="s0"
            nameKey="x"
            innerRadius="55%"
            strokeWidth={2}
            className="stroke-card"
          >
            {data
              .filter((row) => Number(row.s0) > 0)
              .map((row, index) => (
                <Cell key={`${row.x}-${index}`} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
              ))}
          </Pie>
          <ChartLegend
            itemSorter={null}
            content={({ payload }) => (
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs">
                {payload?.map((entry, index) => (
                  <li key={`${entry.value}-${index}`} className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor: entry.color ?? SLICE_COLORS[index % SLICE_COLORS.length],
                      }}
                    />
                    {String(entry.value)}
                  </li>
                ))}
              </ul>
            )}
          />
        </PieChart>
      ) : type === "bar" ? (
        <BarChart data={data} margin={{ left: 4, right: 4 }}>
          {axis}
          {tooltip}
          {legend}
          {series.map((_, index) => (
            <Bar
              isAnimationActive={false}
              key={seriesId(index)}
              dataKey={seriesId(index)}
              fill={`var(--color-${seriesId(index)})`}
              radius={3}
            >
              {series.length === 1
                ? data.map((row, rowIndex) => (
                    <Cell
                      key={`${row.x}-${rowIndex}`}
                      fill={Number(row.s0) < 0 ? "var(--destructive)" : "var(--color-s0)"}
                    />
                  ))
                : null}
            </Bar>
          ))}
        </BarChart>
      ) : type === "area" ? (
        <AreaChart data={data} margin={{ left: 4, right: 4 }}>
          {axis}
          {tooltip}
          {legend}
          {series.map((_, index) => (
            <Area
              isAnimationActive={false}
              key={seriesId(index)}
              dataKey={seriesId(index)}
              type="monotone"
              stroke={`var(--color-${seriesId(index)})`}
              fill={`var(--color-${seriesId(index)})`}
              fillOpacity={0.18}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ left: 4, right: 4 }}>
          {axis}
          {tooltip}
          {legend}
          {series.map((_, index) => (
            <Line
              isAnimationActive={false}
              key={seriesId(index)}
              dataKey={seriesId(index)}
              type="monotone"
              stroke={`var(--color-${seriesId(index)})`}
              strokeWidth={2}
              dot={points.length <= 24}
            />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  );
}
