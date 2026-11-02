# Proposal

## Why

A Nurling's settings live in a narrow side panel next to the chat. Instructions, the scratchpad,
knowledge and the computer all want more room than the panel gives. PR #94 answered that with an
expand button on the Instructions field alone, which opens a dialog. That fixes one field and adds
a second editor to keep in sync. Giving the whole panel the room is simpler and helps every tab.

## What Changes

- Revert the Instructions dialog from #94: delete `InstructionsExpand`, remove its use in
  `InstructionSettings`, drop its message from the locale catalogs, and remove the unarchived
  `instructions-fullscreen` change so no spec describes the dialog.
- The header of a bot's settings panel gets an expand/collapse button beside the close button.
- Expanded, the panel fills the main content area (everything right of the bots sidebar) over the
  chat. The sidebar stays visible.
- Escape or the same button collapses it. Closing the panel also collapses it, so the next open
  starts at the normal width.
- Group, routine, create-group and import panels are unchanged.

## Out of scope

- Web only, which Electron hosts. Mobile keeps its own native screens.
- Below the `md` breakpoint the panel is already an overlay, so the button is not shown there.
- The expanded state is not remembered across reloads or bots.
- No change to what the tabs contain.

## Impact

- New copy, accessible names only on icon buttons, no visible text: "Expand panel" and
  "Collapse panel". A visible label would repeat the icon and cost header space.
- Upstream mergeability: all behaviour lives in one new fork-owned module. The only upstream edit
  is an import and one JSX line in `pages/shell/side-panel.tsx`, in the header beside the close
  button. `bot-panel.tsx`, `Shell.tsx` and `ResizableSidePanel.tsx` are not touched. See
  `design.md`.
- No hosted vendor, no contract or backend change, no network.
- Tests: a component test for the toggle and Escape rules, and a web e2e that opens the expanded
  panel (its screenshot goes in the PR). The e2e runs in CI only.
