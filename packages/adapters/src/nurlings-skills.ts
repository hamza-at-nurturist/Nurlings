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

Components, and nothing else: Stack (direction column, row or columns; gap sm, md or lg), Card (title), Heading (text), Text (text; tone default or muted), Badge (text; tone neutral, success, warning or destructive), Stat (label, value; format number, currency or percent; currency code; tone; hint), Table (columns [{key, label, format text, number, currency, percent or badge; align left or right; tones {cell text: tone}}]; rows {"$state": "/data/x"}; currency code), Chart (type bar or line; data rows; x key; y key; title; format), Callout (text; title; tone), Progress (label, value, max; tone), KeyValue (items [{label, value, format}]; currency code), Tabs (tabs [{id, label}]; value {"$bindState": "/ui/tab"}), Button (label).

Make it read well: lead with Stat tiles for the few numbers that matter and give the one needing attention a warning or destructive tone; show a trend as a Chart, not only a Table; use badge columns for statuses and currency columns for money (negatives show in red); put assumptions in a Callout. Percent values are percentage points (12.5 is 12.5%), and currency defaults to USD. For Tabs, put {"ui": {"tab": "chart"}} in the spec's state and give each tab's container a visible condition such as {"$state": "/ui/tab", "eq": "chart"}.

Lists: put repeat and visible on a container, then read fields with {"$item": "field"} in its children. One column per stage makes a board. A Button runs the one action, askBot, which puts a message in this chat's box; the user still presses Send, so write the message as a ready instruction to yourself, such as a drafted text.

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
