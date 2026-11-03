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

Shape: {"data": ["leads.json"], "spec": {"root": {element}}}. Write the screen as a tree: an element is {"type", "props", "children": [elements]}, with its children written inside it and no ids. A data file x.json is at /data/x, read with {"$state": "/data/x/summary/open"}. When you attach, the file is checked and any problem comes back in the result: fix the file and attach again.

Components, and nothing else. Layout: Stack (direction column, row or columns; gap none, sm, md or lg; align; justify; padding; border bottom, end or top; grow; width sm, md or lg), Grid (columns 1 to 6, sidebar or main-side; gap; fill), Card (title; flush), Separator. Text: Heading (text, hint, level "1", "2" or "3"), Text (text; tone; variant body, small, label, mono or title; truncate; align), Badge (text; tone; shape pill or tag), Icon (name; tone; size), Avatar (name; size). Data: Stat (label, value; format number, currency or percent; currency code; tone; hint; spark list of numbers; delta; sparkTone), Table (columns [{key, label, format text, number, currency, percent, badge, tag, stacked, meter, rating or menu; align left or right; tones {cell text: tone}; toneKey; subKey; max; mono; truncate}]; rows {"$state": "/data/x"}; currency; where {key, includes}; search {value, keys}), Chart (type bar, line, area or pie; data rows; x key; y key, or a list of up to four keys to compare series; title; format; currency), Meter (value, max, tone, wide), Breakdown (segments [{label, value, tone}]; title), Progress (label, value, max; tone), KeyValue (items [{label, value, format}]; currency code), Callout (text; title; tone), Message (from contact, agent or note; text; meta; skipped; decision {tags [{text, tone}], text, footer, rating up or down}), Diff (parts [{text, kind same, add or del}]; title). Controls: Tabs (tabs [{id, label, count}]; value {"$bindState": "/ui/tab"}; variant line), Button (label; variant default, secondary, outline, ghost, destructive or link; size; icon; hint; count; active; full; align start), Input (value; placeholder; icon; hint; width), Textarea (value; placeholder; rows), Select (value; options [{value, label}]), ToggleGroup (items [{value, label}]; value; multiple). Tones: neutral, info, success, warning, destructive, muted. Icons: activity, alert-triangle, arrow-up-down, bell, calendar, check, chevron-left, chevron-right, clock, dollar-sign, external-link, file-text, filter, home, list, message-square, more-horizontal, phone, play, refresh, search, settings, thumbs-down, thumbs-up, trending-up, users, x.

Make it read well: lead with Stat tiles for the few numbers that matter and give the one needing attention a warning or destructive tone; show a trend as a Chart, not only a Table; use badge columns for statuses and currency columns for money (negatives show in red); put assumptions in a Callout. Percent values are percentage points (12.5 is 12.5%), and currency defaults to USD. For Tabs, put {"ui": {"tab": "chart"}} in the spec's state and give each tab's container a visible condition such as {"$state": "/ui/tab", "eq": "chart"}.

Lists: put repeat and visible on a container, then read fields with {"$item": "field"} in its children. One column per stage makes a board. A Button runs askBot, which puts a message in this chat's box (the user still presses Send, so write it as a ready instruction to yourself, such as a drafted text), or setState, which sets a value under /ui in the app's own state.

A tone, a status or a list of options can come from the data, for example {"$item": "tone"} on a Badge. For a full multi-screen product (the "App templates" skill has one to start from): set "layout": "full" at the top of the file, make the root a Grid with columns sidebar, build the navigation from ghost Buttons whose press is {"action": "setState", "params": {"statePath": "/ui/page", "value": "leads"}} with active set by a $cond on /ui/page, put each screen in a container with a visible condition on /ui/page, and give the spec a state with the starting values under /ui. Bind Tabs, Input, Select and ToggleGroup values to /ui paths with $bindState, and let a Table follow them with where (a bucket tab) and search (a typed filter).

\`\`\`json
{"data":["leads.json"],"spec":{"root":{"type":"Stack","props":{"direction":"column","gap":"lg"},"children":[
{"type":"Heading","props":{"text":"Lead pipeline"}},
{"type":"Stack","props":{"direction":"columns","gap":"md"},"children":[
{"type":"Card","props":{"title":"New"},"children":[
{"type":"Stack","props":{"direction":"column","gap":"sm"},"repeat":{"statePath":"/data/leads/leads","key":"address"},"visible":{"$item":"stage","eq":"new"},"children":[
{"type":"Card","props":{"title":{"$item":"address"}},"children":[
{"type":"Text","props":{"text":{"$item":"seller"},"tone":"muted"}},
{"type":"Button","props":{"label":"Draft a text"},"on":{"press":{"action":"askBot","params":{"message":{"$item":"draft"}}}}}]}]}]},
{"type":"Card","props":{"title":"Offer out"},"children":[
{"type":"Stack","props":{"direction":"column","gap":"sm"},"repeat":{"statePath":"/data/leads/leads","key":"address"},"visible":{"$item":"stage","eq":"offer"},"children":[
{"type":"Card","props":{"title":{"$item":"address"}},"children":[
{"type":"Text","props":{"text":{"$item":"seller"},"tone":"muted"}}]}]}]}]}]}}}
\`\`\`

The app refuses a file that uses any other component, prop or action, and draws data as plain text, so use no HTML or scripts. Build only what the user asked for, then tell them the file to open in the Artifacts tab.`,
  },
  {
    name: "App templates",
    description: "A multi-screen mini app to copy and adapt: sidebar, tiles, table, detail",
    body: `A starting point for a mini app with a sidebar and several screens. Copy it, replace the names, data file and columns with the user's, add or remove screens, and keep the structure. Read the "Apps" skill first for every component and prop.

It is a CRM: an Overview screen (tiles and a chart) and a Leads screen (tabs, search and a table) behind a sidebar. The data file leads.json is {"leads": [{"name", "stage", "value", "owner"}], "weekly": [{"week", "won"}], "summary": {"open", "won", "pipeline"}}. Add a screen by adding a nav Button, a state value and a container with a visible condition.

\`\`\`json
{"data":["leads.json"],"layout":"full","spec":{
"state":{"ui":{"page":"overview","tab":"all","q":""}},
"root":{"type":"Grid","props":{"columns":"sidebar"},"children":[
{"type":"Stack","props":{"direction":"column","gap":"sm","padding":"md","border":"end"},"children":[
{"type":"Heading","props":{"text":"Acme CRM","level":"3"}},
{"type":"Button","props":{"label":"Overview","icon":"home","variant":"ghost","align":"start","full":true,"active":{"$cond":{"$state":"/ui/page","eq":"overview"},"$then":true,"$else":false}},"on":{"press":{"action":"setState","params":{"statePath":"/ui/page","value":"overview"}}}},
{"type":"Button","props":{"label":"Leads","icon":"users","variant":"ghost","align":"start","full":true,"active":{"$cond":{"$state":"/ui/page","eq":"leads"},"$then":true,"$else":false}},"on":{"press":{"action":"setState","params":{"statePath":"/ui/page","value":"leads"}}}}]},
{"type":"Stack","props":{"direction":"column","gap":"lg","padding":"lg"},"children":[
{"type":"Stack","props":{"direction":"column","gap":"lg"},"visible":{"$state":"/ui/page","eq":"overview"},"children":[
{"type":"Heading","props":{"text":"Overview"}},
{"type":"Grid","props":{"columns":3,"gap":"md"},"children":[
{"type":"Stat","props":{"label":"Open leads","value":{"$state":"/data/leads/summary/open"},"format":"number"}},
{"type":"Stat","props":{"label":"Won","value":{"$state":"/data/leads/summary/won"},"format":"number","tone":"success"}},
{"type":"Stat","props":{"label":"Pipeline","value":{"$state":"/data/leads/summary/pipeline"},"format":"currency"}}]},
{"type":"Card","props":{"title":"Won per week"},"children":[
{"type":"Chart","props":{"type":"bar","data":{"$state":"/data/leads/weekly"},"x":"week","y":"won"}}]}]},
{"type":"Stack","props":{"direction":"column","gap":"md"},"visible":{"$state":"/ui/page","eq":"leads"},"children":[
{"type":"Heading","props":{"text":"Leads"}},
{"type":"Tabs","props":{"tabs":[{"id":"all","label":"All"},{"id":"new","label":"New"},{"id":"offer","label":"Offer out"}],"value":{"$bindState":"/ui/tab"},"variant":"line"}},
{"type":"Input","props":{"value":{"$bindState":"/ui/q"},"placeholder":"Search leads","icon":"search"}},
{"type":"Table","props":{"columns":[{"key":"name","label":"Lead","format":"text"},{"key":"stage","label":"Stage","format":"badge"},{"key":"value","label":"Value","format":"currency","align":"right"},{"key":"owner","label":"Owner","format":"text"}],"rows":{"$state":"/data/leads/leads"},"where":{"key":"stage","includes":{"$state":"/ui/tab"}},"search":{"value":{"$state":"/ui/q"},"keys":["name","owner"]}}}]}]}]}}}
\`\`\`

Keep one screen visible at a time. Keep numbers and statuses in the data file, not in the app, so refreshing the data refreshes the screen.`,
  },
];
