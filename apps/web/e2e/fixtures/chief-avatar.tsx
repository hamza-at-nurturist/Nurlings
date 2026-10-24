import "../../src/styles.css";
import { I18nProvider } from "@lingui/react";
import { DEFAULT_BOT_AVATAR_COLOR, SHIPPED_BOT_AVATAR_SHAPE_KEYS } from "@rakazo/core";
import { BotAvatar } from "@rakazo/ui-web";
import { createRoot } from "react-dom/client";
import { bootstrapI18n, i18n } from "../../src/lib/i18n";
import { BotLookPicker } from "../../src/pages/shell/avatar-studio-popover";

const chief = `${DEFAULT_BOT_AVATAR_COLOR}::shape_${SHIPPED_BOT_AVATAR_SHAPE_KEYS.indexOf("nurling")}`;
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
        <div className="item" key={size} data-avatar="chief">
          <BotAvatar color={chief} identity="chief" size={size} status={status} />
          <span>{size}</span>
        </div>
      ))}
      {regulars.map((regular) => (
        <div className="item" key={regular.identity} data-avatar="regular">
          <BotAvatar color={regular.value} identity={regular.identity} size={54} status={status} />
          <span>{regular.value}</span>
        </div>
      ))}
    </div>
  );
}

function Compare({ label, status }: { label: string; status?: string }) {
  return (
    <div className="row" data-row={label}>
      <div className="item">
        <BotAvatar color={chief} identity="chief" size={120} status={status} />
        <span>Chief</span>
      </div>
      <div className="item">
        <BotAvatar color="#22C55E" identity="e" size={120} status={status} />
        <span>Organic</span>
      </div>
    </div>
  );
}

void bootstrapI18n("en").then(() => {
  createRoot(document.getElementById("root")!).render(
    <I18nProvider i18n={i18n}>
      {(["light", "dark"] as const).map((theme) => (
        <div className="panel" data-theme={theme} key={theme}>
          <Row label="idle" />
          <Row label="working" status="running" />
          <div className="compare">
            <Compare label="compare-idle" />
            <Compare label="compare-working" status="running" />
          </div>
          <div className="picker" data-picker={theme}>
            <BotLookPicker value={chief} identity="chief" onChange={() => undefined} />
          </div>
        </div>
      ))}
    </I18nProvider>,
  );
});
