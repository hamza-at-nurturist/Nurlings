import { defineRegistry } from "@json-render/react";
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
import { cn } from "@rakazo/ui-web/lib/utils";
import { miniAppCatalog } from "./catalog";

/** Whatever a prop resolved to, as text. Objects and arrays draw as nothing. */
export function asText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

const GAPS = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;

const BADGE_TONES = {
  neutral: "",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "",
} as const;

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
    Badge: ({ props }) => {
      const tone = props.tone ?? "neutral";
      return (
        <Badge
          variant={tone === "destructive" ? "destructive" : "secondary"}
          className={BADGE_TONES[tone]}
        >
          {asText(props.text)}
        </Badge>
      );
    },
    Stat: ({ props }) => (
      <div className="flex min-w-32 flex-col rounded-lg border bg-card p-4">
        <span className="text-2xl font-semibold">{asText(props.value)}</span>
        <span className="text-sm text-muted-foreground">{asText(props.label)}</span>
      </div>
    ),
    Table: ({ props }) => {
      const rows = Array.isArray(props.rows) ? props.rows : [];
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {props.columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                {props.columns.map((column) => (
                  <TableCell key={column.key}>
                    {asText((row as Record<string, unknown>)[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
