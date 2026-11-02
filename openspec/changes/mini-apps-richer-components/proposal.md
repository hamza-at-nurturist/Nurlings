# Proposal

## Why

The first mini apps work, but a real one (a cash dashboard a bot built from the Apps skill) came out
plain: tiles and a table of text, with no chart, no color for what needs attention, and statuses as
bare words. The bot used the catalog correctly; the catalog was too small. Separately, a mini app
attached in chat shows as a generic file with no way to open it, so a person has to find it in the
Artifacts tab.

## What Changes

- **More components.** Chart (bars or a line, negatives in red), Callout, Progress, KeyValue and
  Tabs join the catalog.
- **Richer existing ones.** Stat can show a number as currency, number or percent, take a tone and a
  hint. Table columns can be formatted (currency, number, percent) with negatives in red and
  numbers right-aligned, or drawn as status badges colored by a tones map. KeyValue items take a
  format too.
- **Chat preview.** A mini app attached in chat gets the same preview card as an HTML file and
  opens in the preview dialog. Its `askBot` button puts its message in that chat's composer (the
  bot's, or the group's) and closes the dialog. Nothing is sent.
- **Composer hook.** A small helper lets code outside the composer put text in a thread's composer;
  a mounted composer replaces its text and an unmounted one finds the saved draft when it opens.
- **Bot guidance.** The Apps skill lists the new components and how to use them well.

Not in this change: mobile and desktop renderers, server-run queries, per-app state, formulas,
interactive chart features beyond hover labels.

## Impact

- Capability: `mini-apps`.
- Adds nothing to the dependencies. Web only. No migration, API change or image.
- Touches `composer.tsx` and `composer-draft.ts` (one subscription effect and one helper) and
  `ArtifactFileCard.tsx`.
