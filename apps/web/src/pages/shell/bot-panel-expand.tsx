import { useLingui } from "@lingui/react/macro";
import { Button } from "@rakazo/ui-web";
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import "./bot-panel-expand.css";

/** Escape belongs to an open popup or a single-line field before it belongs to the panel. */
const OWNS_ESCAPE =
  'input, select, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"]';

/**
 * Header button that makes the bot panel fill the main area. While expanded it renders the marker
 * the stylesheet keys on, and it unmounts with the header, so closing the panel collapses it.
 */
export function BotPanelExpand() {
  const { t } = useLingui();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.isComposing || event.keyCode === 229) return;
      if (event.target instanceof Element && event.target.closest(OWNS_ESCAPE)) return;
      setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const Icon = expanded ? Minimize2 : Maximize2;
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="hidden md:inline-flex"
        aria-label={expanded ? t`Collapse panel` : t`Expand panel`}
        onClick={() => setExpanded((current) => !current)}
      >
        <Icon size={16} strokeWidth={1.8} />
      </Button>
      {expanded ? <span hidden data-bot-panel-expanded="" /> : null}
    </>
  );
}
