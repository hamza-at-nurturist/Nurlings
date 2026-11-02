/**
 * A full dashboard as one mini app: a sidebar and four screens (Today, Leads, a lead's
 * conversation, Review) plus a runs list. Everything here is made up: the brand, the people, the
 * addresses and the numbers. Used by tests and the end-to-end fixture, never bundled into the app.
 */
const D = "/data/outreach";

type Props = Record<string, unknown>;
const elements: Record<string, unknown> = {};
let counter = 0;

function el(type: string, props: Props, children: string[] = [], extra: Props = {}): string {
  counter += 1;
  const id = `${type.toLowerCase()}-${counter}`;
  elements[id] = { type, props, children, ...extra };
  return id;
}

const state = (path: string) => ({ $state: path });
const item = (field: string) => ({ $item: field });
const press = (action: string, params: Props) => ({ on: { press: { action, params } } });
const go = (page: string) => press("setState", { statePath: "/ui/page", value: page });
const shown = (page: string) => ({ visible: { $state: "/ui/page", eq: page } });
const each = (statePath: string, key: string, extra: Props = {}) => ({
  repeat: { statePath, key },
  ...extra,
});

const stack = (props: Props, children: string[], extra: Props = {}) =>
  el("Stack", props, children, extra);
const text = (value: unknown, props: Props = {}) => el("Text", { text: value, ...props });

function nav(label: string, icon: string, page: string, count?: string) {
  return el(
    "Button",
    {
      label,
      icon,
      count: count ?? null,
      variant: "ghost",
      full: true,
      align: "start",
      active: { $cond: { $state: "/ui/page", eq: page }, $then: true, $else: false },
    },
    [],
    go(page),
  );
}

/** A page header: title and a hint on the left, controls on the right, a line below. */
function header(title: string, hint: unknown, controls: string[]) {
  return stack(
    { direction: "row", justify: "between", padding: "md", border: "bottom", gap: "md" },
    [
      el("Heading", { text: title, hint, level: "1" }),
      stack({ direction: "row", gap: "sm" }, controls),
    ],
  );
}

const periodTabs = () =>
  el("Tabs", {
    tabs: [
      { id: "today", label: "Today" },
      { id: "7d", label: "7 days" },
      { id: "30d", label: "30 days" },
    ],
    value: { $bindState: "/ui/period" },
  });

const healthy = () => el("Badge", { text: "Worker healthy · 20 s ago", tone: "success" });

const kpi = (index: number) =>
  el("Stat", {
    label: state(`${D}/kpis/${index}/label`),
    value: state(`${D}/kpis/${index}/value`),
    hint: state(`${D}/kpis/${index}/hint`),
    spark: state(`${D}/kpis/${index}/spark`),
    delta: state(`${D}/kpis/${index}/delta`),
    tone: state(`${D}/kpis/${index}/tone`),
    sparkTone: state(`${D}/kpis/${index}/sparkTone`),
  });

// ---------------------------------------------------------------------------------------- sidebar
const sidebar = stack({ direction: "column", gap: "sm", padding: "md", border: "end" }, [
  stack({ direction: "row", gap: "sm" }, [
    el("Avatar", { name: "Outreach Desk", size: "lg" }),
    stack({ direction: "column", gap: "none" }, [
      text("Outreach Desk", { variant: "body", tone: "default" }),
      text("by Northwind", { variant: "small", tone: "muted" }),
    ]),
  ]),
  el("Input", {
    value: { $bindState: "/ui/q" },
    placeholder: "Search",
    icon: "search",
    hint: "/",
  }),
  text("Overview", { variant: "label", tone: "muted" }),
  nav("Today", "activity", "today"),
  nav("Leads", "users", "leads"),
  nav("Review", "thumbs-up", "review", "7"),
  nav("Runs", "list", "runs"),
  text("Monitoring", { variant: "label", tone: "muted" }),
  nav("Needs attention", "alert-triangle", "today", "5"),
  el("Button", {
    label: "Trace viewer",
    icon: "external-link",
    variant: "ghost",
    full: true,
    align: "start",
  }),
  el("Button", {
    label: "CRM",
    icon: "external-link",
    variant: "ghost",
    full: true,
    align: "start",
  }),
  stack({ direction: "column", gap: "none", grow: true }, []),
  el("Separator", {}),
  stack({ direction: "row", gap: "sm" }, [
    el("Avatar", { name: "Sam Hale" }),
    stack({ direction: "column", gap: "none" }, [
      text("Rating as Sam", { variant: "body" }),
      text("Switch to Riley", { variant: "small", tone: "muted" }),
    ]),
  ]),
]);

// ------------------------------------------------------------------------------------------ today
const attentionRow = stack(
  { direction: "row", justify: "between", padding: "md", border: "bottom", gap: "md" },
  [
    stack({ direction: "row", width: "md" }, [
      el("Badge", { text: item("status"), tone: item("tone"), shape: "tag" }),
    ]),
    stack({ direction: "column", gap: "none", grow: true }, [
      text(item("title"), { variant: "body" }),
      text(item("detail"), { variant: "small", tone: "muted" }),
    ]),
    stack({ direction: "row", width: "sm", justify: "end" }, [
      text(item("time"), { variant: "mono", tone: "muted" }),
    ]),
    el("Button", { label: item("action"), size: "sm" }, [], go("lead")),
  ],
);

const today = stack(
  { direction: "column", gap: "none" },
  [
    header("Today", state(`${D}/date`), [periodTabs(), healthy()]),
    stack({ direction: "column", gap: "md", padding: "md" }, [
      el("Grid", { columns: 4, gap: "md" }, [0, 1, 2, 3, 4].map(kpi)),
      el("Grid", { columns: "main-side", gap: "md" }, [
        el("Card", { flush: true }, [
          stack({ direction: "row", justify: "between", padding: "md", border: "bottom" }, [
            text("Needs attention", { variant: "title" }),
            text("5 open", { variant: "small", tone: "muted" }),
          ]),
          stack(
            { direction: "column", gap: "none" },
            [attentionRow],
            each(`${D}/attention`, "title"),
          ),
        ]),
        stack({ direction: "column", gap: "md" }, [
          el("Card", {}, [
            el("Breakdown", { title: "Outcomes today", segments: state(`${D}/outcomes`) }),
          ]),
          el("Card", {}, [
            stack({ direction: "row", justify: "between" }, [
              text("Sam's ratings · 7 days", { variant: "label", tone: "muted" }),
              el("Button", { label: "Review", variant: "link", size: "sm" }, [], go("review")),
            ]),
            stack({ direction: "row", gap: "sm" }, [
              text(state(`${D}/ratings/pct`), { variant: "title" }),
              text(state(`${D}/ratings/note`), { variant: "small", tone: "muted" }),
            ]),
            text(state(`${D}/ratings/detail`), { variant: "small", tone: "muted" }),
            el("Button", { label: "Quality charts", icon: "external-link", size: "sm" }),
          ]),
        ]),
      ]),
    ]),
  ],
  shown("today"),
);

// ------------------------------------------------------------------------------------------ leads
const leads = stack(
  { direction: "column", gap: "none" },
  [
    header("Leads", "248", [
      healthy(),
      el("Badge", { text: "Shadow mode · nothing is sent", tone: "info" }),
    ]),
    stack({ direction: "column", gap: "md", padding: "md" }, [
      el("Grid", { columns: 4, gap: "md" }, [0, 1, 2, 3].map(kpi)),
      el("Tabs", {
        variant: "line",
        value: { $bindState: "/ui/leadsTab" },
        tabs: [
          { id: "all", label: "All", count: "248" },
          { id: "active", label: "Active", count: "171" },
          { id: "review", label: "Needs review", count: "5" },
          { id: "handed", label: "Handed off", count: "38" },
          { id: "unrated", label: "Unrated", count: "7" },
          { id: "optout", label: "Opted out", count: "22" },
        ],
      }),
      stack({ direction: "row", justify: "between", gap: "sm" }, [
        stack({ direction: "row", gap: "sm" }, [
          el("Input", {
            value: { $bindState: "/ui/q" },
            placeholder: "Name, street or city",
            icon: "search",
            width: "md",
          }),
          el("Button", { label: "Outcome", icon: "filter", size: "sm" }),
          el("Button", { label: "Last inbound", icon: "arrow-up-down", size: "sm" }),
          el("Button", { label: "Market: all", size: "sm" }),
        ]),
        el("Button", { label: "Open runs feed", size: "sm" }, [], go("runs")),
      ]),
      el("Card", { flush: true }, [
        el("Table", {
          rows: state(`${D}/leads`),
          where: { key: "buckets", includes: state("/ui/leadsTab") },
          search: { value: state("/ui/q"), keys: ["name", "street", "city"] },
          columns: [
            { key: "name", label: "Contact", format: "stacked", subKey: "role" },
            { key: "street", label: "Property", format: "stacked", subKey: "city" },
            { key: "outcome", label: "Outcome", format: "tag", toneKey: "outcomeTone" },
            { key: "qualified", label: "Qualified", format: "meter", max: 7 },
            { key: "nextStep", label: "Next step", toneKey: "nextTone" },
            { key: "lastReply", label: "Last reply", truncate: true },
            { key: "rating", label: "Rating", format: "rating" },
            { key: "lastInbound", label: "Last inbound", mono: true },
            { key: "menu", label: "", format: "menu" },
          ],
        }),
      ]),
      stack({ direction: "row", justify: "between" }, [
        text("Showing 1–8 of 248", { variant: "small", tone: "muted" }),
        stack({ direction: "row", gap: "sm" }, [
          el("Button", { label: "Previous", size: "sm" }),
          el("Button", { label: "Next", size: "sm" }),
        ]),
      ]),
    ]),
  ],
  shown("leads"),
);

// ------------------------------------------------------------------------------------ lead page
const thread = (path: string) =>
  stack(
    { direction: "column", gap: "md", padding: "md" },
    [
      el("Message", {
        from: item("from"),
        text: item("text"),
        meta: item("meta"),
        skipped: item("skipped"),
        decision: item("decision"),
      }),
    ],
    each(path, "id"),
  );

const known = stack({ direction: "row", justify: "between", padding: "md", border: "bottom" }, [
  stack({ direction: "column", gap: "none" }, [
    text(item("label"), { variant: "body" }),
    text(item("sub"), { variant: "small", tone: "muted" }),
  ]),
  el("Badge", { text: item("status"), tone: item("tone"), shape: "tag" }),
]);

const fact = (label: string, path: string) =>
  stack({ direction: "column", gap: "none" }, [
    text(label, { variant: "small", tone: "muted" }),
    text(state(path), { variant: "body" }),
  ]);

const lead = stack(
  { direction: "column", gap: "none" },
  [
    stack({ direction: "row", justify: "between", padding: "md", border: "bottom" }, [
      stack({ direction: "row", gap: "sm" }, [
        el("Button", { label: "Leads", variant: "link", size: "sm" }, [], go("leads")),
        text("/", { tone: "muted" }),
        text(state(`${D}/lead/name`), { variant: "body" }),
      ]),
      stack({ direction: "row", gap: "sm" }, [
        el("Button", { label: "Trace", icon: "external-link", size: "sm" }),
        el("Button", {
          label: "Open in CRM",
          icon: "external-link",
          variant: "default",
          size: "sm",
        }),
      ]),
    ]),
    stack({ direction: "column", gap: "md", padding: "md" }, [
      stack({ direction: "row", gap: "md" }, [
        el("Avatar", { name: state(`${D}/lead/name`), size: "lg" }),
        stack({ direction: "column", gap: "none" }, [
          stack({ direction: "row", gap: "sm" }, [
            el("Heading", { text: state(`${D}/lead/name`), level: "1" }),
            el("Badge", { text: "CONTINUE", tone: "info", shape: "tag" }),
            el("Badge", { text: "SHADOW", tone: "neutral", shape: "tag" }),
          ]),
          text(state(`${D}/lead/summary`), { variant: "small", tone: "muted" }),
        ]),
      ]),
      el("Grid", { columns: "main-side", gap: "md" }, [
        el("Card", { flush: true }, [
          stack({ direction: "row", justify: "between", padding: "md", border: "bottom" }, [
            text("Conversation", { variant: "title" }),
            text(state(`${D}/lead/counts`), { variant: "small", tone: "muted" }),
          ]),
          thread(`${D}/lead/thread`),
        ]),
        stack({ direction: "column", gap: "md" }, [
          el("Card", { flush: true }, [
            stack({ direction: "row", justify: "between", padding: "md", border: "bottom" }, [
              text("What the bot knows", { variant: "label", tone: "muted" }),
              text("3/7", { variant: "mono", tone: "muted" }),
            ]),
            stack({ direction: "row", padding: "md", border: "bottom" }, [
              el("Meter", { value: 3, max: 7, tone: "info", label: "Known", wide: true }),
            ]),
            stack({ direction: "column", gap: "none" }, [known], each(`${D}/lead/knows`, "label")),
          ]),
          el("Card", {}, [
            text("Contact", { variant: "label", tone: "muted" }),
            el("Grid", { columns: 2, gap: "md" }, [
              fact("Role", `${D}/lead/contact/role`),
              fact("Price pushes", `${D}/lead/contact/pushes`),
              fact("Texts handled", `${D}/lead/contact/handled`),
              fact("Last inbound", `${D}/lead/contact/lastInbound`),
            ]),
          ]),
          el("Card", {}, [
            text("Deal summary", { variant: "label", tone: "muted" }),
            text(state(`${D}/lead/deal`), { variant: "small", tone: "muted" }),
          ]),
          el("Card", {}, [
            text("CRM actions", { variant: "label", tone: "muted" }),
            text(state(`${D}/lead/actions`), { variant: "small", tone: "muted" }),
          ]),
        ]),
      ]),
    ]),
  ],
  shown("lead"),
);

// ---------------------------------------------------------------------------------------- review
const review = stack(
  { direction: "column", gap: "none" },
  [
    header("Review", "7 unrated", [
      text("3 / 7", { variant: "mono", tone: "muted" }),
      el("Meter", { value: 3, max: 7, tone: "info", label: "Reviewed" }),
      el("Button", { label: "Prev", hint: "K", size: "sm" }),
      el("Button", { label: "Skip", hint: "J", size: "sm" }),
    ]),
    stack({ direction: "column", gap: "md", padding: "md" }, [
      el("Grid", { columns: "main-side", gap: "md" }, [
        el("Card", { flush: true }, [
          stack({ direction: "row", justify: "between", padding: "md", border: "bottom" }, [
            stack({ direction: "row", gap: "sm" }, [
              el("Avatar", { name: state(`${D}/lead/name`) }),
              stack({ direction: "column", gap: "none" }, [
                text(state(`${D}/lead/name`), { variant: "body" }),
                text(state(`${D}/lead/short`), { variant: "small", tone: "muted" }),
              ]),
            ]),
            stack({ direction: "row", gap: "sm" }, [
              el("Button", { label: "Lead page", variant: "link", size: "sm" }, [], go("lead")),
              el("Button", { label: "CRM", variant: "link", size: "sm" }),
              el("Button", { label: "Trace", variant: "link", size: "sm" }),
            ]),
          ]),
          thread(`${D}/review/thread`),
          stack({ direction: "column", gap: "sm", padding: "md", border: "top" }, [
            stack({ direction: "row", gap: "sm" }, [
              el("Badge", { text: "CONTINUE", tone: "info", shape: "tag" }),
              el("Badge", { text: "CONF 0.81", tone: "muted", shape: "tag" }),
              el("Badge", { text: "PROMPT V4 #3", tone: "muted", shape: "tag" }),
            ]),
            text(state(`${D}/review/reason`), { variant: "small", tone: "muted" }),
          ]),
        ]),
        el("Card", {}, [
          el("Heading", { text: "Is this the right reply?", level: "2" }),
          el("Grid", { columns: 2, gap: "sm" }, [
            el("Button", { label: "Good", icon: "thumbs-up", hint: "U", size: "md" }),
            el("Button", {
              label: "Needs a fix",
              icon: "thumbs-down",
              hint: "D",
              variant: "destructive",
              size: "md",
            }),
          ]),
          text("What's wrong", { variant: "label", tone: "muted" }),
          el("ToggleGroup", {
            value: { $bindState: "/ui/wrong" },
            items: state(`${D}/review/wrongOptions`),
          }),
          text("Better reply · optional", { variant: "label", tone: "muted" }),
          el("Textarea", { value: { $bindState: "/ui/better" }, rows: 3 }),
          el("Diff", { title: "Change", parts: state(`${D}/review/diff`) }),
          el("Grid", { columns: 2, gap: "sm" }, [
            stack({ direction: "column", gap: "sm" }, [
              text("Right outcome", { variant: "label", tone: "muted" }),
              el("Select", {
                value: { $bindState: "/ui/outcome" },
                options: state(`${D}/review/outcomes`),
              }),
            ]),
            stack({ direction: "column", gap: "sm" }, [
              text("Comment", { variant: "label", tone: "muted" }),
              el("Input", { value: { $bindState: "/ui/comment" }, placeholder: "Optional" }),
            ]),
          ]),
          el("Button", {
            label: "Save and next",
            variant: "default",
            hint: "Enter",
            size: "md",
            full: true,
          }),
          text(
            "Saved as scores on this reply's trace. A fix with a better reply also goes into the training set.",
            {
              variant: "small",
              tone: "muted",
            },
          ),
        ]),
      ]),
    ]),
  ],
  shown("review"),
);

// ------------------------------------------------------------------------------------------ runs
const runs = stack(
  { direction: "column", gap: "none" },
  [
    header("Runs", "Latest first", [healthy()]),
    stack({ direction: "column", gap: "md", padding: "md" }, [
      el("Card", { flush: true }, [
        el("Table", {
          rows: state(`${D}/runs`),
          columns: [
            { key: "id", label: "Run", mono: true },
            { key: "lead", label: "Lead", format: "stacked", subKey: "street" },
            { key: "mode", label: "Mode", format: "tag", toneKey: "modeTone" },
            { key: "status", label: "Status", format: "badge", toneKey: "statusTone" },
            { key: "duration", label: "Duration", mono: true, align: "right" },
            { key: "started", label: "Started", mono: true },
          ],
        }),
      ]),
    ]),
  ],
  shown("runs"),
);

const root = el("Grid", { columns: "sidebar", gap: "none", fill: true }, [
  sidebar,
  stack({ direction: "column", gap: "none" }, [today, leads, lead, review, runs]),
]);

export const outreachApp = JSON.stringify({
  data: ["outreach.json"],
  layout: "full",
  spec: {
    root,
    state: {
      ui: {
        page: "today",
        period: "today",
        leadsTab: "all",
        q: "",
        wrong: ["wrong-question"],
        better:
          "totally get it. roughly when do you think the timing might line up, this year or next? - sam",
        outcome: "same",
        comment: "",
      },
    },
    elements,
  },
});

const spark = (...values: number[]) => values;

const people = [
  [
    "Marcus Webb",
    "owner",
    "12 Alder Way",
    "Fairview, ST",
    "CONTINUE",
    "info",
    3,
    "Sends in 4 min",
    "warning",
    "totally get it, no rush at all. when wou…",
    null,
    "2:10 PM",
    ["all", "active"],
  ],
  [
    "Elena Ortiz",
    "owner",
    "88 Cove Creek Dr",
    "Lakeside, ST",
    "DEAL",
    "success",
    6,
    "Specialist has it",
    "neutral",
    "—",
    "up",
    "1:52 PM",
    ["all", "active", "handed"],
  ],
  [
    "Noah Brandt",
    "heir",
    "5 Kiln Street",
    "Fairview, ST",
    "HUMAN REVIEW",
    "warning",
    2,
    "Draft ready",
    "warning",
    "sorry to hear about your dad. no pres…",
    null,
    "1:31 PM",
    ["all", "review", "unrated"],
  ],
  [
    "Aisha Karim",
    "owner",
    "40 Orchard Rd",
    "Hillcrest, ST",
    "CONTINUE",
    "info",
    4,
    "Sent 11:12 AM",
    "success",
    "got it. is anyone living there right now…",
    "down",
    "11:05 AM",
    ["all", "active"],
  ],
  [
    "Leo Fontaine",
    "owner",
    "9 Elm Court",
    "Lakeside, ST",
    "DNC",
    "destructive",
    1,
    "Opted out",
    "muted",
    "—",
    null,
    "12:48 PM",
    ["all", "optout"],
  ],
  [
    "Grace Liu",
    "spouse",
    "73 Harbor Ave",
    "Hillcrest, ST",
    "HUMAN REVIEW",
    "warning",
    3,
    "Draft ready",
    "warning",
    "makes sense. what number would ma…",
    null,
    "10:40 AM",
    ["all", "review", "unrated"],
  ],
  [
    "Hugo Santos",
    "owner",
    "21 Lakeview Ln",
    "Fairview, ST",
    "WARM",
    "success",
    5,
    "Specialist has it",
    "neutral",
    "—",
    "up",
    "9:58 AM",
    ["all", "active", "handed"],
  ],
  [
    "Mira Kovacs",
    "unknown",
    "3 Pine Street",
    "Riverton, ST",
    "FOLLOW UP",
    "muted",
    2,
    "Sent 9:20 AM",
    "success",
    "no worries, i'll check back in the spri…",
    null,
    "9:04 AM",
    ["all", "active"],
  ],
] as const;

export const outreachData = {
  date: "Thu, Oct 29",
  kpis: [
    {
      label: "Texts in",
      value: 142,
      hint: "31 stopped by gates",
      delta: "+12%",
      tone: "neutral",
      sparkTone: "info",
      spark: spark(8, 11, 9, 14, 12, 16, 13, 18, 15, 19, 17, 21),
    },
    {
      label: "Replies planned",
      value: 88,
      hint: "6 cancelled at pre-send",
      delta: "+4%",
      tone: "neutral",
      sparkTone: "info",
      spark: spark(5, 7, 6, 8, 9, 7, 10, 9, 12, 10, 13, 12),
    },
    {
      label: "Handed off",
      value: 9,
      hint: "4 deal · 5 warm",
      delta: "",
      tone: "success",
      sparkTone: "success",
      spark: spark(1, 2, 1, 3, 2, 2, 4, 3, 3, 5, 4, 5),
    },
    {
      label: "Needs review",
      value: 5,
      hint: "drafts waiting",
      delta: "",
      tone: "warning",
      sparkTone: "warning",
      spark: spark(3, 2, 4, 3, 5, 2, 4, 3, 5, 4, 3, 5),
    },
    {
      label: "Failures",
      value: 2,
      hint: "1 job · 1 CRM action",
      delta: "",
      tone: "destructive",
      sparkTone: "destructive",
      spark: spark(0, 1, 0, 0, 1, 0, 2, 1, 0, 1, 2, 2),
    },
  ],
  attention: [
    {
      status: "FAILED",
      tone: "destructive",
      title: "Marcus Webb · Alder Way",
      detail: "CRM task failed after 1 hour of retries: lead not found.",
      time: "12:41 PM",
      action: "Retry",
    },
    {
      status: "GAVE UP",
      tone: "destructive",
      title: "Elena Ortiz · 4th Ave",
      detail: "Gave up after 1 hour: model provider out of credits.",
      time: "11:58 AM",
      action: "Requeue",
    },
    {
      status: "HUMAN REVIEW",
      tone: "warning",
      title: "Noah Brandt · Kiln Street",
      detail: "Seller mentioned probate. Draft ready for review.",
      time: "1:31 PM",
      action: "Open draft",
    },
    {
      status: "HUMAN REVIEW",
      tone: "warning",
      title: "Aisha Karim · Orchard Rd",
      detail: "Reply broke the price check, and the repair failed too.",
      time: "10:40 AM",
      action: "Open draft",
    },
    {
      status: "STALLED",
      tone: "muted",
      title: "Leo Fontaine · Harbor Ave",
      detail: "Send is 6 min past its planned time.",
      time: "2:22 PM",
      action: "View",
    },
  ],
  outcomes: [
    { label: "Continue", value: 69, tone: "info" },
    { label: "Deal / warm", value: 9, tone: "success" },
    { label: "Human review", value: 10, tone: "warning" },
    { label: "Follow up / task", value: 12, tone: "muted" },
    { label: "DNC / wrong number", value: 11, tone: "destructive" },
  ],
  ratings: {
    pct: "81%",
    note: "good, of 26 rated",
    detail: "Top fix reason: wrong question · 5 corrections in the training set",
  },
  leads: people.map(
    ([
      name,
      role,
      street,
      city,
      outcome,
      outcomeTone,
      qualified,
      nextStep,
      nextTone,
      lastReply,
      rating,
      lastInbound,
      buckets,
    ]) => ({
      name,
      role,
      street,
      city,
      outcome,
      outcomeTone,
      qualified,
      nextStep,
      nextTone,
      lastReply,
      rating,
      lastInbound,
      buckets,
    }),
  ),
  lead: {
    name: "Marcus Webb",
    short: "12 Alder Way · Fairview",
    summary: "12 Alder Way · Fairview, ST · Bot owner: Sam · [phone]",
    counts: "3 texts from Marcus · 2 handled by the bot",
    contact: { role: "Owner", pushes: "1", handled: "2", lastInbound: "2:10 PM" },
    deal: "Not handed off yet. Written when the bot hands the lead to a specialist.",
    actions: "None for this lead. Notes, tasks and bot owner changes show here with their status.",
    knows: [
      { label: "Timeline", sub: "“timing is off”, no date", status: "VAGUE", tone: "warning" },
      { label: "Occupancy", sub: "Owner lives there", status: "ANSWERED", tone: "success" },
      {
        label: "Price ballpark",
        sub: "“depends on the number”",
        status: "DECLINED",
        tone: "muted",
      },
      { label: "Condition", sub: "", status: "MISSING", tone: "muted" },
      { label: "Motivation", sub: "", status: "MISSING", tone: "muted" },
      { label: "Title", sub: "", status: "MISSING", tone: "muted" },
      { label: "Open to call", sub: "", status: "MISSING", tone: "muted" },
    ],
    thread: [
      { id: "m0", from: "note", text: "Mon, Oct 26", meta: "", skipped: false, decision: null },
      {
        id: "m1",
        from: "agent",
        text: "hey marcus, this is sam. any chance you'd look at an offer on your place on alder way?",
        meta: "Sequence · 10:02 AM",
        skipped: false,
        decision: null,
      },
      {
        id: "m2",
        from: "contact",
        text: "maybe. depends on the number",
        meta: "Marcus · 10:31 AM",
        skipped: false,
        decision: null,
      },
      {
        id: "m3",
        from: "agent",
        text: "fair enough. what's your timeline looking like if the number works out? - sam",
        meta: "",
        skipped: false,
        decision: {
          tags: [
            { text: "CONTINUE", tone: "info" },
            { text: "SENT 10:42", tone: "success" },
          ],
          text: "Seller is open to an offer, so the bot asked about timeline next.",
          footer: "",
          rating: "up",
        },
      },
      { id: "m4", from: "note", text: "Today", meta: "", skipped: false, decision: null },
      {
        id: "m5",
        from: "contact",
        text: "I would but timing is off and I have no idea what the number would be until the timing is right",
        meta: "Marcus · 2:09 PM",
        skipped: false,
        decision: null,
      },
      {
        id: "m6",
        from: "contact",
        text: "ok",
        meta: "Marcus · 2:10 PM · skipped, a newer text came in so the bot answered that one",
        skipped: true,
        decision: null,
      },
      {
        id: "m7",
        from: "agent",
        text: "totally get it, no rush at all. when would be a good time for me to check back in? - sam",
        meta: "",
        skipped: false,
        decision: {
          tags: [
            { text: "CONTINUE", tone: "info" },
            { text: "SENDS 2:16 · IN 4 MIN", tone: "warning" },
            { text: "CONF 0.81", tone: "muted" },
          ],
          text: "Seller isn't ready yet and gave no timeframe, so the bot kept qualifying.",
          footer: "Pre-send check at 2:14 PM · no CRM actions",
          rating: null,
        },
      },
    ],
  },
  review: {
    reason: "Seller isn't ready yet and gave no timeframe, so the bot kept qualifying.",
    thread: [
      {
        id: "r1",
        from: "agent",
        text: "fair enough. what's your timeline looking like if the number works out? - sam",
        meta: "",
        skipped: false,
        decision: null,
      },
      {
        id: "r2",
        from: "contact",
        text: "I would but timing is off and I have no idea what the number would be until the timing is right",
        meta: "",
        skipped: false,
        decision: null,
      },
      {
        id: "r3",
        from: "agent",
        text: "totally get it, no rush at all. when would be a good time for me to check back in? - sam",
        meta: "Bot's reply",
        skipped: false,
        decision: null,
      },
    ],
    wrongOptions: [
      { value: "wrong-outcome", label: "Wrong outcome" },
      { value: "wrong-question", label: "Wrong question" },
      { value: "tone-off", label: "Tone off" },
      { value: "too-pushy", label: "Too pushy" },
      { value: "wrong-fact", label: "Wrong fact" },
      { value: "handoff", label: "Should have handed off" },
      { value: "other", label: "Other" },
    ],
    outcomes: [
      { value: "same", label: "Same (continue)" },
      { value: "human", label: "Human review" },
      { value: "handoff", label: "Hand off" },
      { value: "dnc", label: "Do not contact" },
    ],
    diff: [
      { text: "totally get it", kind: "same" },
      { text: ", no rush at all. when would be a good time for me to check back in?", kind: "del" },
      {
        text: ". roughly when do you think the timing might line up, this year or next?",
        kind: "add",
      },
      { text: " - sam", kind: "same" },
    ],
  },
  runs: [
    {
      id: "run_4f2a",
      lead: "Marcus Webb",
      street: "12 Alder Way",
      mode: "LIVE",
      modeTone: "info",
      status: "OK",
      statusTone: "success",
      duration: "1.8 s",
      started: "2:14 PM",
    },
    {
      id: "run_4f29",
      lead: "Elena Ortiz",
      street: "88 Cove Creek Dr",
      mode: "LIVE",
      modeTone: "info",
      status: "FAILED",
      statusTone: "destructive",
      duration: "62 s",
      started: "12:41 PM",
    },
    {
      id: "run_4f28",
      lead: "Noah Brandt",
      street: "5 Kiln Street",
      mode: "SHADOW",
      modeTone: "muted",
      status: "OK",
      statusTone: "success",
      duration: "2.4 s",
      started: "1:31 PM",
    },
    {
      id: "run_4f27",
      lead: "Aisha Karim",
      street: "40 Orchard Rd",
      mode: "LIVE",
      modeTone: "info",
      status: "STALLED",
      statusTone: "warning",
      duration: "—",
      started: "10:40 AM",
    },
    {
      id: "run_4f26",
      lead: "Grace Liu",
      street: "73 Harbor Ave",
      mode: "SHADOW",
      modeTone: "muted",
      status: "OK",
      statusTone: "success",
      duration: "1.6 s",
      started: "10:12 AM",
    },
  ],
};
