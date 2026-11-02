# Tasks

- [x] Revert #94: delete `apps/web/src/components/InstructionsExpand.tsx`, undo its import and
      element in `InstructionSettings.tsx`, run `pnpm --filter @rakazo/web intl:extract`, and
      delete `openspec/changes/instructions-fullscreen`. Verify: `grep -rn "InstructionsExpand\|Expand instructions"`
      finds nothing outside git history; web typecheck passes.
- [x] Add the fork-owned `BotPanelExpand` component and its stylesheet in `apps/web/src/pages/shell/`
      (button, hidden marker, Escape rule, `Maximize2`/`Minimize2` icons, hidden below `md`). Verify:
      component test (toggle, accessible names, Escape collapses, Escape ignored when
      `defaultPrevented` or from a text field, unmount resets).
- [x] Render it in `side-panel.tsx` beside the close button for bot tabs only, keyed by bot id.
      Verify: the render is guarded by `botTab && active`, so group and routine panels never get
      it; no edits to `bot-panel.tsx`, `Shell.tsx` or `ResizableSidePanel.tsx` (`git diff --stat`).
- [x] Extract the two Lingui messages with `intl:extract`. Verify: catalogs list exactly
      "Expand panel" and "Collapse panel" and nothing else new.
- [x] Add a web e2e that opens a bot's settings, expands the panel and asserts it covers the chat
      with the sidebar still visible, then collapses with Escape. Assert the aside widens, stops at
      the sidebar and reaches the right edge, so a renamed `data-testid="side-panel"` fails CI.
      The button is hidden below `md`. Verify: runs in CI only (not locally); its screenshot goes
      in the PR description via `pr-watch`.
- [x] Run `pnpm --filter @rakazo/web typecheck` and the web unit tests. Verify: both pass.
