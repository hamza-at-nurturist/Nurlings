import "../../src/styles.css";
import { BotAvatar } from "@rakazo/ui-web";
import { createRoot } from "react-dom/client";

const sizes = [36, 42, 54, 200];
const regulars = [
  { value: "#F97316::shape_3", identity: "regular-shape-a" },
  { value: "#0EA5E9::shape_7", identity: "regular-shape-b" },
  { value: "#22C55E", identity: "regular-hex" },
];

function Row({ label, status }: { label: string; status?: string }) {
  return (
    <div className="row" data-row={label}>
      {sizes.map((size) => (
        <div className="item" key={size}>
          <BotAvatar color="::brand_chief" identity="chief" size={size} status={status} />
          <span>{size}</span>
        </div>
      ))}
      {status
        ? null
        : regulars.map((regular) => (
            <div className="item" key={regular.identity}>
              <BotAvatar color={regular.value} identity={regular.identity} size={54} />
              <span>{regular.value}</span>
            </div>
          ))}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <>
    {(["light", "dark"] as const).map((theme) => (
      <div className="panel" data-theme={theme} key={theme}>
        <Row label="idle" />
        <Row label="working" status="running" />
      </div>
    ))}
  </>,
);
