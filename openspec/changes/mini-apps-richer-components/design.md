# Design

## Decisions

- **Charts use shadcn's chart, loaded on demand.** It is the repo's official-registry route and gives
  axes, tooltips and legends for bar, line, area and pie. The chart code is a separate chunk that
  loads only when an app has a chart. Series are drawn under fixed ids (s0 to s3), never under a
  name from the app file, because the chart library turns series ids into CSS variable names.
  Colors are shades of the app's ink, with the destructive color for negative bars.
- **Formats are a catalog concept.** `format` and `currency` are props, so a bot says what a value
  is and the app decides how to show it, in the person's locale. Percent takes percentage points.
- **Tones are fixed.** neutral, success, warning and destructive map to the app's status colors, so
  a bot cannot invent colors.
- **Tabs reuse the library's state.** The tab value is bound to a state path and each tab's content
  is a container with a visible condition on that path. No new mechanism.
- **Composer requests are an event, like drafts being accepted.** `requestComposerDraft` writes the
  draft and notifies subscribers for that thread key, so the composer needs no knowledge of mini
  apps.

## Risks

- A mounted composer replaces its text when a request arrives, so a half-written message is lost.
  The person pressed a button for it, and the request is rare; the draft is not sent.
