# Design

## Decisions

- **One catalog, shadcn's vocabulary.** Components are named and shaped like shadcn's, drawn with
  the app's own Base UI versions, so a bot that knows shadcn writes them without a lookup and the
  look stays the app's. Composites that shadcn has no single component for (Meter, Breakdown,
  Message, Diff, Stat with a trend) are small parts built from the same pieces.
- **Data decides tone.** An enum prop can also take an expression, so a table row's data can say
  its badge is destructive. The component then reads the value as a tone name and falls back to
  neutral for anything else.
- **State is the app's own, under `/ui`.** `setState` only writes there, never into the data a bot
  saved, so a file cannot overwrite what it displays. Pages are containers with a visible condition.
- **Icons are a fixed list.** A name outside it refuses the file, so a file can only ask for a
  drawing from that set.
- **Tables filter on the client.** `where` and `search` filter rows the app already holds, so there
  is no query to run and nothing is sent anywhere.
- **List structure is checked except one rule.** json-render insists that a repeated list also exists
  in the spec's own state. A mini app's data arrives after it opens, so that one rule is ignored and
  every other structural check stays.

## Risks

- The catalog is large, and every prop is more for a bot to get wrong. The validator names the
  failing element, and the Apps skill carries the full list.
- Overlays (dialogs, menus, select lists) draw outside the mini app container and so do not take its
  black and white palette. Select is in the catalog; its list uses the app's own colors until a
  later change fixes the portal.
