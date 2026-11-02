# Design

## Decisions

- **No backend yet.** The bot already owns the MCP connections and approvals. Having it save data
  as JSON artifacts reuses the dashboard path, so queries run by the server wait for a second
  change once this one shows what the format needs.
- **Spec, not HTML.** The model can only produce what the catalog allows, so every app shares the
  app's look, fixes are small diffs, and a mobile renderer can draw the same file later.
- **Catalog owned by the app.** `@json-render/shadcn` is built on Radix; the app uses shadcn on
  Base UI. The catalog maps to existing tokens and classes instead.
- **Action opens a draft.** `askBot` writes the composer draft and navigates. It cannot send, so
  it adds no way around the bot's own approvals.
- **Strict validation.** The file is parsed against the catalog before drawing. Unknown
  components, wrong props or oversized files show one plain message.

## Library behavior this relies on

- The library's `validate` only checks that component types exist, and returns a copy without `on`,
  `repeat` and `visible`. The app checks every element's props and every action binding against
  the catalog itself, and draws the original spec.
- Leaf elements need an explicit `children` list; the app fills in a missing one.
- In an action's params, `$item` resolves to the field's state path, so the `askBot` handler reads
  paths under `/data/` from the store.

## File format

```json
{
  "data": ["leads.json"],
  "spec": { "root": "page", "elements": { "...": {} } }
}
```

Each data file is available to the spec at `/data/<name without .json>`.

## Risks

- json-render is 0.x and changes quickly. Versions are pinned exactly and the stored file is the
  library's spec, so an upgrade is deliberate and a swap needs a converter.
- Data comes from outside tools, so text in it is shown as plain text and never as markup.
