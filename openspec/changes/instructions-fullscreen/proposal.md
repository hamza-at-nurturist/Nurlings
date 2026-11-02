# Proposal

## Why

A Nurling's instructions are edited in the narrow side panel of its chat. Long instructions are
cramped there, so people stop editing them, and instructions are the main way to teach a Nurling
how to work.

## What Changes

- The Instructions section of a bot's settings gets an expand button beside the history button.
- It opens a large editor over the page that edits the same text. Saving, conflict handling and
  history work as they do in the panel.
- Closing the editor returns to the panel with the saved text.

## Out of scope

- No change to how instructions are stored, versioned or sent to the model.
- Mobile keeps its own native instructions screen; this change is the web UI, which Electron hosts.
- No training or review flow yet. This is the room to work in.

## Impact

Exempt from a design doc: one small decision (reuse the existing dialog and the panel's own
editor logic). New copy: one accessible name, "Expand instructions", on an icon button with no
visible text. A visible label would repeat the icon and cost panel space.
Tests: a component test that the expanded editor saves the same text.
