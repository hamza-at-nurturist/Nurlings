/**
 * Built-in skills that exist only in Nurlings. They live here, not in builtin-skills.ts, so that
 * file stays close to upstream and merges stay clean.
 */
export const NURLINGS_SKILLS: Array<{ name: string; description: string; body: string }> = [
  {
    name: "Apps",
    description: "Build a mini app: a live pipeline, board or table over your tools",
    body: `Build a mini app as one JSON file and attach it with attach_file as <name>.app.json (for example lead-pipeline.app.json), with a one-line description. It gives the user one screen over data from their connected tools.

Get the data with the user's connected tools first. Save what the screen shows as separate JSON files with fixed names (for example leads.json), attached the same way, including any counts and ready-to-use drafts. To refresh, attach the data file again with the same name: the app reads it again every 10 seconds. Never put secrets, tokens or credentials in either file.

Shape: {"data": ["leads.json"], "spec": {"root": "page", "elements": {...}}}. Every element is {"type", "props", "children": [element keys]}. A data file x.json is at /data/x, read with {"$state": "/data/x/summary/open"}.

Components, and nothing else. Layout: Stack (direction column, row or columns; gap none, sm, md or lg; align; justify; padding; border bottom, end or top; grow; width sm, md or lg), Grid (columns 1 to 6, sidebar or main-side; gap; fill), Card (title; flush), Separator. Text: Heading (text, hint, level 1 to 3), Text (text; tone; variant body, small, label, mono or title; truncate; align), Badge (text; tone; shape pill or tag), Icon (name; tone; size), Avatar (name; size). Data: Stat (label, value; format number, currency or percent; currency code; tone; hint; spark list of numbers; delta; sparkTone), Table (columns [{key, label, format text, number, currency, percent, badge, tag, stacked, meter, rating or menu; align; tones {cell text: tone}; toneKey; subKey; max; mono; truncate}]; rows {"$state": "/data/x"}; currency; where {key, includes}; search {value, keys}), Chart (type bar, line, area or pie; data rows; x key; y key, or a list of up to four keys to compare series; title; format; currency), Meter (value, max, tone, wide), Breakdown (segments [{label, value, tone}]; title), Progress (label, value, max; tone), KeyValue (items [{label, value, format}]; currency code), Callout (text; title; tone), Message (from contact, agent or note; text; meta; skipped; decision {tags [{text, tone}], text, footer, rating up or down}), Diff (parts [{text, kind same, add or del}]; title). Controls: Tabs (tabs [{id, label, count}]; value {"$bindState": "/ui/tab"}; variant line), Button (label; variant default, secondary, outline, ghost, destructive or link; size; icon; hint; count; active; full; align start), Input (value; placeholder; icon; hint; width), Textarea (value; placeholder; rows), Select (value; options [{value, label}]), ToggleGroup (items [{value, label}]; value; multiple). Tones: neutral, info, success, warning, destructive, muted. Icons: activity, alert-triangle, arrow-up-down, bell, calendar, check, chevron-left, chevron-right, clock, dollar-sign, external-link, file-text, filter, home, list, message-square, more-horizontal, phone, play, refresh, search, settings, thumbs-down, thumbs-up, trending-up, users, x.

Make it read well: lead with Stat tiles for the few numbers that matter and give the one needing attention a warning or destructive tone; show a trend as a Chart, not only a Table; use badge columns for statuses and currency columns for money (negatives show in red); put assumptions in a Callout. Percent values are percentage points (12.5 is 12.5%), and currency defaults to USD. For Tabs, put {"ui": {"tab": "chart"}} in the spec's state and give each tab's container a visible condition such as {"$state": "/ui/tab", "eq": "chart"}.

Lists: put repeat and visible on a container, then read fields with {"$item": "field"} in its children. One column per stage makes a board. A Button runs askBot, which puts a message in this chat's box (the user still presses Send, so write it as a ready instruction to yourself, such as a drafted text), or setState, which sets a value under /ui in the app's own state.

A tone, a status or a list of options can come from the data, for example {"$item": "tone"} on a Badge. For a full multi-screen product: set "layout": "full" at the top of the file, make the root a Grid with columns sidebar, build the navigation from ghost Buttons whose press is {"action": "setState", "params": {"statePath": "/ui/page", "value": "leads"}} with active set by a $cond on /ui/page, put each screen in a container with a visible condition on /ui/page, and give the spec a state with the starting values under /ui. Bind Tabs, Input, Select and ToggleGroup values to /ui paths with $bindState, and let a Table follow them with where (a bucket tab) and search (a typed filter).

\`\`\`json
{"data":["leads.json"],"spec":{"root":"page","elements":{
"page":{"type":"Stack","props":{"direction":"column","gap":"lg"},"children":["title","board"]},
"title":{"type":"Heading","props":{"text":"Lead pipeline"},"children":[]},
"board":{"type":"Stack","props":{"direction":"columns","gap":"md"},"children":["col-new","col-offer"]},
"col-new":{"type":"Card","props":{"title":"New"},"children":["list-new"]},
"col-offer":{"type":"Card","props":{"title":"Offer out"},"children":["list-offer"]},
"list-new":{"type":"Stack","props":{"direction":"column","gap":"sm"},"repeat":{"statePath":"/data/leads/leads","key":"address"},"visible":{"$item":"stage","eq":"new"},"children":["lead"]},
"list-offer":{"type":"Stack","props":{"direction":"column","gap":"sm"},"repeat":{"statePath":"/data/leads/leads","key":"address"},"visible":{"$item":"stage","eq":"offer"},"children":["lead"]},
"lead":{"type":"Card","props":{"title":{"$item":"address"}},"children":["seller","ask"]},
"seller":{"type":"Text","props":{"text":{"$item":"seller"},"tone":"muted"},"children":[]},
"ask":{"type":"Button","props":{"label":"Draft a text"},"on":{"press":{"action":"askBot","params":{"message":{"$item":"draft"}}}},"children":[]}
}}}
\`\`\`

The app refuses a file that uses any other component, prop or action, and draws data as plain text, so use no HTML or scripts. Build only what the user asked for, then tell them the file to open in the Artifacts tab.`,
  },
];
