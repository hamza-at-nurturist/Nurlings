import { Trans, useLingui } from "@lingui/react/macro";
import { buttonVariants } from "@rakazo/ui-web";
import { ChevronLeft } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { LoadingState } from "../components/ai/primitives";
import { NeedsYouTray } from "../components/nest/NeedsYouTray";
import { NurlingGrid } from "../components/nest/NurlingGrid";
import type { NestSectionProps } from "../components/nest/types";
import { useNestSnapshot } from "../lib/nest-snapshot";
import { errorText } from "../lib/user-error";
import { WindowChrome } from "./WindowChrome";

/** Rendered top to bottom. A new section is a new component added here. */
export const NEST_SECTIONS: ComponentType<NestSectionProps>[] = [NeedsYouTray, NurlingGrid];

export function NestPage() {
  const { t } = useLingui();
  const state = useNestSnapshot();
  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <WindowChrome />
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          to="/app"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label={t`Back`}
        >
          <ChevronLeft />
        </Link>
        <h1 className="flex-1 font-medium">
          <Trans>The Nest</Trans>
        </h1>
      </header>
      <main className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {state.status === "loading" ? <LoadingState /> : null}
          {state.status === "failed" ? (
            <p role="alert" className="text-sm text-destructive">
              {errorText(state.error)}
            </p>
          ) : null}
          {state.status === "ready"
            ? NEST_SECTIONS.map((Section, index) => (
                <Section key={Section.name || index} snapshot={state.snapshot} />
              ))
            : null}
        </div>
      </main>
    </div>
  );
}
