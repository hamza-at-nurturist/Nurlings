# Design

## Decisions

- **Charts are SVG, not a chart library.** Two simple shapes cover dashboards, and a library adds a
  dependency and its own look. Bars and a line draw from the app's tokens, with a dashed zero line
  and the tooltips of `<title>` elements. The figure has an accessible summary of its first and
  last points.
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
