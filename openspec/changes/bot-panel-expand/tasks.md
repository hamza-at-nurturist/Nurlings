# Tasks

- [ ] Revert #94: delete `apps/web/src/components/InstructionsExpand.tsx`, undo its import and
      element in `InstructionSettings.tsx`, run `pnpm --filter @rakazo/web intl:extract`, and
      delete `openspec/changes/instructions-fullscreen`. Verify: `grep -rn "InstructionsExpand\|Expand instructions"`
      finds nothing outside git history; web typecheck passes.
- [ ] Add the fork-owned `BotPanelExpand` component and its stylesheet in `apps/web/src/pages/shell/`
      (button, hidden marker, Escape rule, `Maximize2`/`Minimize2` icons, hidden below `md`). Verify:
      component test (toggle, accessible names, Escape collapses, Escape ignored when
      `defaultPrevented` or from a text field, unmount resets).
- [ ] Render it in `side-panel.tsx` beside the close button for bot tabs only, keyed by bot id.
      Verify: component test that group and routine panels show no button; no edits to
      `bot-panel.tsx`, `Shell.tsx` or `ResizableSidePanel.tsx` (`git diff --stat`).
- [ ] Extract the two Lingui messages with `intl:extract`. Verify: catalogs list exactly
      "Expand panel" and "Collapse panel" and nothing else new.
- [ ] Add a web e2e that opens a bot's settings, expands the panel and asserts it covers the chat
      with the sidebar still visible, then collapses with Escape. Verify: runs in CI only (not
      locally); its screenshot goes in the PR description via `pr-watch`.
- [ ] Run `pnpm --filter @rakazo/web typecheck` and the web unit tests. Verify: both pass.
