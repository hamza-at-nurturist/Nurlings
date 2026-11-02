/**
 * The first mini app: a wholesaler's lead pipeline. The bot saves `leads.json` (summary, leads
 * with a drafted reply each) and this file as `lead-pipeline.app.json`. Used by tests and the
 * end-to-end fixture, never bundled into the app.
 */
const stages = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["offer", "Offer out"],
] as const;

const elements: Record<string, unknown> = {
  page: {
    type: "Stack",
    props: { direction: "column", gap: "lg" },
    children: ["title", "stats", "board"],
  },
  title: { type: "Heading", props: { text: "Lead pipeline" } },
  stats: {
    type: "Stack",
    props: { direction: "row", gap: "md" },
    children: ["stat-open", "stat-due"],
  },
  "stat-open": {
    type: "Stat",
    props: { label: "Open leads", value: { $state: "/data/leads/summary/open" } },
  },
  "stat-due": {
    type: "Stat",
    props: { label: "Follow-ups due", value: { $state: "/data/leads/summary/due" } },
  },
  board: {
    type: "Stack",
    props: { direction: "columns", gap: "md" },
    children: stages.map(([key]) => `col-${key}`),
  },
  "lead-card": {
    type: "Card",
    props: { title: { $item: "address" } },
    children: ["lead-seller", "lead-asking", "lead-ask"],
  },
  "lead-seller": { type: "Text", props: { text: { $item: "seller" }, tone: "muted" } },
  "lead-asking": { type: "Badge", props: { text: { $item: "asking" }, tone: "neutral" } },
  "lead-ask": {
    type: "Button",
    props: { label: "Draft a text" },
    on: { press: { action: "askBot", params: { message: { $item: "draft" } } } },
  },
};

for (const [key, label] of stages) {
  elements[`col-${key}`] = {
    type: "Card",
    props: { title: label },
    children: [`list-${key}`],
  };
  elements[`list-${key}`] = {
    type: "Stack",
    props: { direction: "column", gap: "sm" },
    repeat: { statePath: "/data/leads/leads", key: "address" },
    visible: { $item: "stage", eq: key },
    children: ["lead-card"],
  };
}

export const leadPipelineApp = JSON.stringify({
  data: ["leads.json"],
  spec: { root: "page", elements },
});

export const leadPipelineData = {
  summary: { open: 3, due: 1 },
  leads: [
    {
      address: "14 Cedar Lane",
      seller: "M. Rivera",
      stage: "new",
      asking: "$118,000",
      draft: "Draft a text to M. Rivera about 14 Cedar Lane: ask when they would like to talk.",
    },
    {
      address: "902 Oak Street",
      seller: "J. Patel",
      stage: "contacted",
      asking: "$164,500",
      draft: "Draft a follow-up text to J. Patel about 902 Oak Street.",
    },
    {
      address: "31 Birch Court",
      seller: "A. Chen",
      stage: "offer",
      asking: "$203,000",
      draft: "Draft a text to A. Chen about our offer on 31 Birch Court.",
    },
  ],
};
