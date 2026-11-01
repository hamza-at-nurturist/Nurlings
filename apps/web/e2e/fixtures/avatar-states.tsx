import "../../src/styles.css";
import { PICKABLE_ORGANIC_SHAPE_INDEXES } from "@rakazo/core";
import { BotAvatar, BotAvatarActivityProvider } from "@rakazo/ui-web";
import { createRoot } from "react-dom/client";

type Live = { tool: "write" | "search" | "computer" | "none"; composing: boolean };
const none: Live = { tool: "none", composing: false };

// Each case is one Nurling: what the run reports, what the worker said it is using.
const CASES = [
  { id: "idle", label: "Idle", props: {} },
  {
    id: "thinking",
    label: "Thinking",
    props: { status: "running" },
    live: { ...none, composing: true },
  },
  { id: "working", label: "Working", props: { status: "running" } },
  { id: "needs", label: "Needs you", props: { status: "waiting_input" } },
  { id: "review", label: "In review", props: { ticketStatus: "review" } },
  { id: "blocked", label: "Blocked", props: { status: "failed" } },
  { id: "done", label: "Done", props: { ticketStatus: "done" } },
  { id: "asleep", label: "Asleep", props: { asleep: true } },
] as const;

const VARIANTS = [
  {
    id: "write",
    label: "Writing",
    props: { status: "running" },
    live: { ...none, tool: "write" as const },
  },
  {
    id: "search",
    label: "Searching",
    props: { status: "running" },
    live: { ...none, tool: "search" as const },
  },
  {
    id: "computer",
    label: "Computer",
    props: { status: "running" },
    live: { ...none, tool: "computer" as const },
  },
  { id: "ring", label: "Progress ring", props: { status: "running", progress: 0.6 } },
  { id: "ripple", label: "Ripples", props: { status: "queued" } },
  { id: "long", label: "Long run", props: { status: "running" } },
] as const;

const lives = new Map<string, Live>();
for (const item of [...CASES, ...VARIANTS]) {
  for (const size of [96, 24]) {
    const live = "live" in item ? item.live : none;
    lives.set(`${item.id}-${size}`, live);
  }
}
const source = {
  subscribe: () => () => {},
  getActivity: () => "idle" as const,
  getLive: (id: string) => lives.get(id) ?? none,
};

function Row({
  title,
  items,
  size,
}: {
  title: string;
  items: readonly (typeof CASES)[number][] | readonly (typeof VARIANTS)[number][];
  size: number;
}) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="row" data-row={`${title}-${size}`}>
        {items.map((item) => (
          <div className="case" key={item.id}>
            <BotAvatar
              color="#14B8A6::shape_9"
              identity={`${item.id}-${size}`}
              name={item.label}
              size={size}
              {...item.props}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Every body the picker offers, in picker order: Chief, the three originals, the ten organic families.
const BODY_NAMES = ["Chief", "Bean", "Drift", "Sprout"];
const BODIES = PICKABLE_ORGANIC_SHAPE_INDEXES.map((shapeIndex, position) => ({
  shapeIndex,
  label: BODY_NAMES[position] ?? `Family ${position - BODY_NAMES.length + 1}`,
}));

function Bodies() {
  return (
    <section>
      <h2>Bodies, with their gloss</h2>
      <div className="row" data-row="bodies">
        {BODIES.map(({ shapeIndex, label }) => (
          <div className="case" key={shapeIndex}>
            <BotAvatar
              color={`#14B8A6::shape_${shapeIndex}`}
              identity={`body-${shapeIndex}`}
              name={label}
              size={96}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <BotAvatarActivityProvider source={source}>
    <Row title="States" items={CASES} size={96} />
    <Row title="Working, other ways" items={VARIANTS} size={96} />
    <Row title="At 24px only the pip tells" items={CASES} size={24} />
    <Bodies />
  </BotAvatarActivityProvider>,
);
