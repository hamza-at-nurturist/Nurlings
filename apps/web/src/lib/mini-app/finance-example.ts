/**
 * A small cash-runway dashboard with made-up numbers. It uses every component the lead pipeline
 * does not: stat tones and formats, a chart, a callout, a progress bar, key facts, tabs and a
 * table with badge cells. Used by tests and the end-to-end fixture, never bundled into the app.
 */
const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const SPEND = 410.5;

let balance = 2600;
const months = MONTHS.map((name, index) => {
  const opening = balance;
  balance = Math.round((opening - SPEND) * 100) / 100;
  return {
    month: `${name} ${index < 2 ? 2026 : 2027}`,
    opening,
    out: SPEND,
    closing: balance,
    status: balance < 0 ? "Below zero" : "OK",
  };
});

export const financeData = {
  summary: { cash: 2189.5, monthly: SPEND, runout: "Jun 2027", usedPercent: 71 },
  months,
};

const columns = [
  { key: "month", label: "Month" },
  { key: "opening", label: "Opening", format: "currency" },
  { key: "out", label: "Out", format: "currency" },
  { key: "closing", label: "Closing", format: "currency" },
  {
    key: "status",
    label: "Status",
    format: "badge",
    tones: { OK: "success", "Below zero": "destructive" },
  },
];

export const financeApp = JSON.stringify({
  data: ["finance.json"],
  spec: {
    root: "page",
    state: { ui: { tab: "chart" } },
    elements: {
      page: {
        type: "Stack",
        props: { direction: "column", gap: "lg" },
        children: ["title", "note", "stats", "tabs", "chart-view", "table-view"],
      },
      title: { type: "Heading", props: { text: "Finance overview" } },
      note: {
        type: "Callout",
        props: {
          tone: "warning",
          title: "Assumption",
          text: "No new income is counted after November. Unconfirmed deposits are left out.",
        },
      },
      stats: {
        type: "Stack",
        props: { direction: "row", gap: "md" },
        children: ["stat-cash", "stat-spend", "stat-runout", "runway"],
      },
      "stat-cash": {
        type: "Stat",
        props: {
          label: "Cash now",
          format: "currency",
          value: { $state: "/data/finance/summary/cash" },
        },
      },
      "stat-spend": {
        type: "Stat",
        props: {
          label: "Monthly spend",
          format: "currency",
          value: { $state: "/data/finance/summary/monthly" },
        },
      },
      "stat-runout": {
        type: "Stat",
        props: {
          label: "Cash runs out",
          tone: "warning",
          hint: "At the current spend",
          value: { $state: "/data/finance/summary/runout" },
        },
      },
      runway: {
        type: "Progress",
        props: {
          label: "Runway used",
          tone: "warning",
          value: { $state: "/data/finance/summary/usedPercent" },
        },
      },
      tabs: {
        type: "Tabs",
        props: {
          tabs: [
            { id: "chart", label: "Chart" },
            { id: "table", label: "Table" },
          ],
          value: { $bindState: "/ui/tab" },
        },
      },
      "chart-view": {
        type: "Stack",
        props: { direction: "column", gap: "md" },
        visible: { $state: "/ui/tab", eq: "chart" },
        children: ["chart", "facts"],
      },
      chart: {
        type: "Chart",
        props: {
          type: "bar",
          title: "Closing cash by month",
          data: { $state: "/data/finance/months" },
          x: "month",
          y: "closing",
          format: "currency",
        },
      },
      facts: {
        type: "KeyValue",
        props: {
          items: [
            { label: "Months of data", value: 12 },
            {
              label: "Spend per month",
              format: "currency",
              value: { $state: "/data/finance/summary/monthly" },
            },
          ],
        },
      },
      "table-view": {
        type: "Stack",
        props: { direction: "column", gap: "md" },
        visible: { $state: "/ui/tab", eq: "table" },
        children: ["table"],
      },
      table: {
        type: "Table",
        props: { columns, rows: { $state: "/data/finance/months" } },
      },
    },
  },
});
