import { useBoundProp } from "@json-render/react";
import type { IconName } from "@rakazo/mini-app";
import { Avatar, AvatarFallback } from "@rakazo/ui-web/components/ui/avatar";
import { Badge } from "@rakazo/ui-web/components/ui/badge";
import { Button } from "@rakazo/ui-web/components/ui/button";
import { Input } from "@rakazo/ui-web/components/ui/input";
import { Kbd } from "@rakazo/ui-web/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rakazo/ui-web/components/ui/select";
import { Textarea } from "@rakazo/ui-web/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@rakazo/ui-web/components/ui/toggle-group";
import { cn } from "@rakazo/ui-web/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Home,
  List,
  type LucideIcon,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Play,
  RefreshCw,
  Search,
  Settings,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { asText, formatValue, toNumber, type ValueFormat } from "./format";

export type Tone = "neutral" | "info" | "success" | "warning" | "destructive" | "muted";

const TONE_NAMES = ["neutral", "info", "success", "warning", "destructive", "muted"] as const;

/** A tone from whatever a prop resolved to; anything that is not a tone name is neutral. */
export function toTone(value: unknown, fallback: Tone = "neutral"): Tone {
  return typeof value === "string" && (TONE_NAMES as readonly string[]).includes(value)
    ? (value as Tone)
    : fallback;
}

const ICONS: Record<IconName, LucideIcon> = {
  activity: Activity,
  "alert-triangle": AlertTriangle,
  "arrow-up-down": ArrowUpDown,
  bell: Bell,
  calendar: Calendar,
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  clock: Clock,
  "dollar-sign": DollarSign,
  "external-link": ExternalLink,
  "file-text": FileText,
  filter: Filter,
  home: Home,
  list: List,
  "message-square": MessageSquare,
  "more-horizontal": MoreHorizontal,
  phone: Phone,
  play: Play,
  refresh: RefreshCw,
  search: Search,
  settings: Settings,
  "thumbs-down": ThumbsDown,
  "thumbs-up": ThumbsUp,
  "trending-up": TrendingUp,
  users: Users,
  x: X,
};

export const TEXT_TONES: Record<Tone, string> = {
  neutral: "",
  info: "text-link",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

export const FILL_TONES: Record<Tone, string> = {
  neutral: "bg-primary",
  info: "bg-link",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/40",
};

const BADGE_TONES: Record<Tone, string> = {
  neutral: "",
  info: "bg-link/15 text-link",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "",
  muted: "bg-muted text-muted-foreground",
};

const ICON_SIZES = { sm: "size-3.5", md: "size-4", lg: "size-5" } as const;

export function MiniIcon({
  name,
  tone,
  size = "md",
  className,
}: {
  name: IconName;
  tone?: Tone | null;
  size?: keyof typeof ICON_SIZES | null;
  className?: string;
}) {
  const Icon = ICONS[name];
  return (
    <Icon
      aria-hidden
      className={cn(ICON_SIZES[size ?? "md"], "shrink-0", TEXT_TONES[tone ?? "neutral"], className)}
    />
  );
}

export function StatusBadge({
  text,
  tone,
  shape,
}: {
  text: string;
  tone: Tone;
  shape?: "pill" | "tag" | null;
}) {
  return (
    <Badge
      variant={tone === "destructive" ? "destructive" : "secondary"}
      className={cn(
        BADGE_TONES[tone],
        shape === "tag" &&
          "h-5 rounded-[5px] border border-current/20 px-1.5 font-mono text-[11px] tracking-wide uppercase",
      )}
    >
      {text}
    </Badge>
  );
}

/** A tiny trend line. It is decoration, so it has no text and is hidden from screen readers. */
export function Sparkline({ values, tone }: { values: number[]; tone?: Tone | null }) {
  const points = values.filter((value) => Number.isFinite(value)).slice(0, 120);
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const span = Math.max(...points) - min || 1;
  const width = 96;
  const height = 32;
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - 3 - ((value - min) / span) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-8 w-24 shrink-0", TEXT_TONES[tone ?? "info"] || "text-primary")}
    >
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** n of max as segments, such as 3 of 7. */
export function MeterBar({
  value,
  max,
  tone,
  label,
  wide,
}: {
  value: number;
  max: number;
  tone?: Tone | null;
  label?: string;
  wide?: boolean | null;
}) {
  const steps = Math.min(12, Math.max(1, Math.round(max)));
  const filled = Math.min(steps, Math.max(0, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={steps}
      aria-valuenow={filled}
      className={cn("flex items-center gap-[3px]", wide && "w-full")}
    >
      {Array.from({ length: steps }, (_, index) => (
        <span
          // The segments are fixed in number and order.
          key={index}
          className={cn(
            "h-2 rounded-[2px]",
            wide ? "h-1.5 flex-1" : "w-1.5",
            index < filled ? FILL_TONES[tone ?? "info"] : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

export function BreakdownBar({
  segments,
  title,
}: {
  segments: { label: string; value: number; tone?: Tone | null }[];
  title?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0) || 1;
  return (
    <div className="flex flex-col gap-3">
      {title ? (
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </span>
      ) : null}
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className={FILL_TONES[segment.tone ?? "neutral"]}
            style={{ width: `${(Math.max(0, segment.value) / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span
              className={cn("size-2 shrink-0 rounded-[2px]", FILL_TONES[segment.tone ?? "neutral"])}
            />
            <span>{segment.label}</span>
            <span className="ml-auto text-muted-foreground tabular-nums">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Decision = {
  tags?: { text: string; tone?: Tone | null }[] | null;
  text?: string | null;
  footer?: string | null;
  rating?: "up" | "down" | null;
};

export function MessageView({
  from,
  text,
  meta,
  skipped,
  decision,
}: {
  from: "contact" | "agent" | "note";
  text: string;
  meta: string;
  skipped?: boolean | null;
  decision?: Decision | null;
}) {
  if (from === "note") {
    return (
      <p className="py-1 text-center font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
        {text}
      </p>
    );
  }
  const agent = from === "agent";
  return (
    <div className={cn("flex flex-col gap-1.5", agent ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          agent ? "bg-primary text-primary-foreground" : "border bg-card",
          skipped && "border-dashed bg-transparent text-muted-foreground",
        )}
      >
        {text}
      </div>
      {meta ? <span className="px-1 text-xs text-muted-foreground">{meta}</span> : null}
      {decision ? (
        <div className="flex w-full max-w-[85%] flex-col gap-2 rounded-xl border bg-card p-3 text-sm">
          {decision.tags?.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {decision.tags.map((tag) => (
                <StatusBadge
                  key={tag.text}
                  text={tag.text}
                  tone={tag.tone ?? "neutral"}
                  shape="tag"
                />
              ))}
            </div>
          ) : null}
          {decision.text ? <p>{decision.text}</p> : null}
          {decision.footer || decision.rating ? (
            <div className="flex items-center justify-between gap-3 border-t pt-2 text-xs text-muted-foreground">
              <span>{decision.footer}</span>
              {decision.rating ? (
                <MiniIcon
                  name={decision.rating === "up" ? "thumbs-up" : "thumbs-down"}
                  tone={decision.rating === "up" ? "success" : "destructive"}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DiffView({
  parts,
  title,
}: {
  parts: { text: string; kind: "same" | "add" | "del" }[];
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
      {title ? (
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </span>
      ) : null}
      <p className="text-sm leading-6">
        {parts.map((part, index) => (
          <span
            // The parts are a fixed, ordered text.
            key={index}
            className={cn(
              part.kind === "del" && "bg-destructive/10 text-destructive line-through",
              part.kind === "add" && "bg-success/10 text-success",
            )}
          >
            {part.text}
          </span>
        ))}
      </p>
    </div>
  );
}

type Column = {
  key: string;
  label: string;
  format?: string | null;
  align?: "left" | "right" | null;
  tones?: Record<string, Tone> | null;
  toneKey?: string | null;
  subKey?: string | null;
  max?: number | null;
  mono?: boolean | null;
  truncate?: boolean | null;
};

const isRight = (column: Column) =>
  column.align === "right" ||
  (!column.align && ["number", "currency", "percent"].includes(column.format ?? ""));

function cellTone(column: Column, row: Record<string, unknown>, text: string): Tone {
  const named = column.toneKey ? asText(row[column.toneKey]) : "";
  const tone = named || column.tones?.[text] || "neutral";
  return tone in TEXT_TONES ? (tone as Tone) : "neutral";
}

export function filterRows(
  rows: Record<string, unknown>[],
  where: { key: string; includes: unknown } | null | undefined,
  search: { value: unknown; keys: string[] } | null | undefined,
): Record<string, unknown>[] {
  let result = rows;
  const wanted = asText(where?.includes);
  if (where && wanted && wanted !== "all") {
    result = result.filter((row) => {
      const field = row[where.key];
      return Array.isArray(field) ? field.map(String).includes(wanted) : String(field) === wanted;
    });
  }
  const typed = asText(search?.value).trim().toLowerCase();
  if (search && typed) {
    result = result.filter((row) =>
      search.keys.some((key) => asText(row[key]).toLowerCase().includes(typed)),
    );
  }
  return result;
}

export function TableCell_({
  column,
  row,
  currency,
}: {
  column: Column;
  row: Record<string, unknown>;
  currency?: string | null;
}) {
  const value = row[column.key];
  const kind = column.format ?? "text";
  const mono = column.mono && "font-mono text-xs";
  if (kind === "badge" || kind === "tag") {
    const label = asText(value);
    return label ? (
      <StatusBadge
        text={label}
        tone={cellTone(column, row, label)}
        shape={kind === "tag" ? "tag" : "pill"}
      />
    ) : null;
  }
  if (kind === "stacked") {
    const sub = column.subKey ? asText(row[column.subKey]) : "";
    return (
      <div className="flex flex-col">
        <span className={cn("font-medium", column.truncate && "max-w-56 truncate")}>
          {asText(value)}
        </span>
        {sub ? <span className="font-mono text-xs text-muted-foreground">{sub}</span> : null}
      </div>
    );
  }
  if (kind === "meter") {
    const max = column.max ?? 7;
    return (
      <div className="flex items-center gap-2">
        <MeterBar value={toNumber(value) ?? 0} max={max} label={column.label} />
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {toNumber(value) ?? 0}/{max}
        </span>
      </div>
    );
  }
  if (kind === "rating") {
    const rating = asText(value);
    return rating === "up" || rating === "down" ? (
      <MiniIcon
        name={rating === "up" ? "thumbs-up" : "thumbs-down"}
        tone={rating === "up" ? "success" : "destructive"}
      />
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }
  if (kind === "menu") {
    return <MiniIcon name="more-horizontal" tone="muted" />;
  }
  const number = kind === "text" ? null : toNumber(value);
  return (
    <span
      className={cn(
        mono,
        kind !== "text" && "tabular-nums",
        number !== null && number < 0 && "text-destructive",
        kind === "text" && TEXT_TONES[cellTone(column, row, asText(value))],
        column.truncate && "block max-w-64 truncate",
      )}
    >
      {kind === "text" ? asText(value) : formatValue(value, kind as ValueFormat, currency)}
    </span>
  );
}

export { isRight };

/** A button as the app file describes it: variant, icon, key hint, count and an active state. */
export function ActionButton({
  label,
  variant,
  size,
  icon,
  hint,
  count,
  active,
  full,
  align,
  onPress,
}: {
  label: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link" | null;
  size?: "sm" | "md" | null;
  icon?: IconName | null;
  hint?: string;
  count?: string;
  active?: boolean;
  full?: boolean | null;
  align?: "start" | "center" | null;
  onPress: () => void;
}) {
  return (
    <Button
      variant={variant ?? "outline"}
      size={size === "md" ? "default" : "sm"}
      onClick={onPress}
      aria-current={active ? "page" : undefined}
      className={cn(
        full && "w-full",
        align === "start" && "justify-start",
        active && "border-border bg-card font-medium text-foreground shadow-xs",
      )}
    >
      {icon ? <MiniIcon name={icon} /> : null}
      {label}
      {count ? (
        <span className="ml-auto rounded-full bg-primary px-1.5 text-[11px] leading-4 text-primary-foreground tabular-nums">
          {count}
        </span>
      ) : null}
      {hint ? <Kbd className="ml-1">{hint}</Kbd> : null}
    </Button>
  );
}

export function Initials({ name, size }: { name: string; size?: "sm" | "md" | "lg" | null }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <Avatar size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}>
      <AvatarFallback>{letters}</AvatarFallback>
    </Avatar>
  );
}

const FIELD_WIDTHS = { sm: "w-44", md: "w-72", lg: "w-96", full: "w-full" } as const;

export function TextField({
  value,
  bound,
  placeholder,
  icon,
  hint,
  width,
}: {
  value: unknown;
  bound?: string;
  placeholder?: string;
  icon?: IconName | null;
  hint?: string;
  width?: "sm" | "md" | "lg" | "full" | null;
}) {
  const [current, setCurrent] = useBoundProp<string>(
    typeof value === "string" ? value : undefined,
    bound,
  );
  return (
    <div className={cn("relative", FIELD_WIDTHS[width ?? "full"])}>
      {icon ? (
        <MiniIcon
          name={icon}
          tone="muted"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
      ) : null}
      <Input
        value={current ?? ""}
        placeholder={placeholder}
        onChange={(event) => setCurrent(event.target.value)}
        className={cn(icon && "pl-9", hint && "pr-10")}
      />
      {hint ? (
        <Kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">{hint}</Kbd>
      ) : null}
    </div>
  );
}

export function AreaField({
  value,
  bound,
  placeholder,
  rows,
}: {
  value: unknown;
  bound?: string;
  placeholder?: string;
  rows?: number | null;
}) {
  const [current, setCurrent] = useBoundProp<string>(
    typeof value === "string" ? value : undefined,
    bound,
  );
  return (
    <Textarea
      value={current ?? ""}
      placeholder={placeholder}
      rows={rows ?? 3}
      onChange={(event) => setCurrent(event.target.value)}
    />
  );
}

export function SelectField({
  value,
  bound,
  options,
  placeholder,
}: {
  value: unknown;
  bound?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [current, setCurrent] = useBoundProp<string>(
    typeof value === "string" ? value : undefined,
    bound,
  );
  return (
    <Select
      value={current ?? options[0]?.value ?? ""}
      onValueChange={(next) => setCurrent(String(next))}
      items={options}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ChipsField({
  value,
  bound,
  items,
  multiple,
}: {
  value: unknown;
  bound?: string;
  items: { value: string; label: string }[];
  multiple?: boolean | null;
}) {
  const [current, setCurrent] = useBoundProp<string | string[]>(
    typeof value === "string" || Array.isArray(value) ? (value as string | string[]) : undefined,
    bound,
  );
  const selected = Array.isArray(current) ? current : current ? [current] : [];
  return (
    <ToggleGroup
      multiple={Boolean(multiple)}
      value={selected}
      onValueChange={(next) => setCurrent(multiple ? next : (next[0] ?? ""))}
      variant="outline"
      spacing={2}
      className="flex-wrap"
    >
      {items.map((item) => (
        <ToggleGroupItem key={item.value} value={item.value}>
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
