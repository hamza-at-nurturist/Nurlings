# Design

## Snapshot shape

`nest.snapshot` takes an optional `{ dayStart }` (ISO time, the start of the caller's local day).
Output: the two phase 1 keys plus one new key.

```
{
  nurlings: [{ ...phase 1 fields,
               lastActivity: { at, text } | null }],          // new field, finished-run based
  needsYou: [{ ...phase 1 fields,
               options: [{ id, label }] | null }],             // new field, plain questions only
  today:    [{ botId, done, failed, routineRuns, tokens }]     // new key
}
```

Existing keys keep their meaning. `nurlings` is returned already ordered by attention.

## Ordering

Server side, in `buildNestSnapshot`, as a stable sort over the roster order the snapshot already
uses (pinned, position, created): needs you, then error, then working, then everything else. The
client renders the order it gets, as it renders the mood.

## Last activity

One bounded read for the page's Nurlings: the newest finished foreground run per Nurling (status
`completed`, `failed` or `cancelled`, background triggers excluded, newest `completedAt`). Text is
`activityPreview` of its task prompt, the same helper the current-task line uses. Shown only when
the card has no current task and is not waiting on the user. A Nurling that never ran has `null`
and shows nothing, as today.

## Today

Two grouped reads over the caller's space and user since `dayStart` (clamped to at most the last
24 hours so a bad value cannot widen the scan):

- runs: count by bot and status for finished non-background runs, with the routine-started subset;
- usage: sum of `totalTokens` by bot from `UsageRecord`.

Both ride the same `Promise.all` as the phase 1 reads. A bot with nothing today is omitted from
`today`; the client treats a missing entry as zero and hides the line.

## Answer in place

`needsYou[]` gains `options` for a plain question ask (not secret, not approval, not takeover):
the block's `actions` as `{ id, label }`. The tray shows those as buttons next to "Open". A click
calls `rpc.threads.answer` with `botId` or `groupId`, `runId`, `messageId` and the action id as the
answer, exactly what the chat's `AskCard` sends. The button disables while the call is in flight,
a failure shows the existing error text, and success leaves the item for the next poll to remove,
so the tray never decides on its own that an ask is gone.

## Mood indicator

Option A (or B) is described in the proposal. Either way the ring is the avatar's wrapper in the
card (a border, no new layout), colors come from semantic tokens only (`warning`, `destructive`,
`success`, neutral border, muted), and the working pulse is CSS and off under
`prefers-reduced-motion`. The label is plain text from the mood's existing strings.

## Risks

- A snapshot that grows: a handful of small reads, bounded to the space and day; the visibility
  gate keeps the polling cost as in phase 1.
- "Today" in a time zone the server does not know: handled by the client sending `dayStart`.
- Answering races a run that was just answered in the thread: `threads.answer` already rejects a
  stale ask; the tray shows that error and the next poll clears the item.
