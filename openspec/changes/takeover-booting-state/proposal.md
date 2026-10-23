# Proposal

## Why

Now and then, the computer view gets stuck on "Booting live desktop…" and never recovers.

**What the user sees today.** A bot needs the computer (to sign in somewhere, say) and hands it to
you: a card says "Needs you" with an Open button. You press Open and the computer view appears with
the message "Booting live desktop…". The message never goes away, there is no "Take control" button,
and nothing you do helps until you reload the page. It is rare: we saw it once, in a continuous
integration run, in a test that does exactly this.

**What causes it.** The browser only learns that a computer has finished starting in two ways: when
the browser asked for the start itself, or when it re-reads the chat's state. When the bot starts
the computer in the background, nothing tells the browser that it finished. (The server announces
a computer's status change to the browser only when the computer goes to sleep, never when it
finishes starting.) So if the browser's last read happened to catch the computer halfway through
starting, it keeps showing "starting" for good. In the failing run the server had the computer ready
about a third of a second after the bot asked for it, and the page still said "booting" two minutes
later, with no further request about the computer apart from a 15-second check for image updates.
That the missed moment is a fraction of a second wide is why it is so rare.

**What self-healing would do.** While the screen says the computer is starting and someone is
looking at it, the page quietly asks again every few seconds and switches to the normal view as soon
as the computer is ready (or shows the error if it failed). It stops once the state changes, when
the view is closed, or when the tab is hidden. When the computer is already running, nothing
changes at all.

## What Changes

- A small hook, in a new file, re-checks the computer's status every 3 seconds (the same cadence as
  the sidebar) only while the open computer view says "booting" and the browser is not itself
  waiting for a start. It reuses the page's existing refresh, so the result is applied the same way
  as any other status update. It stops on any other state, on close, while the tab is hidden, and
  on an error that retrying cannot fix.
- One line in the shell page uses the hook.
- A unit test reproduces the stuck case: the status says booting, then the server says running, and
  the view recovers; plus the cases where it must not poll.
- No new words on screen, no server change, no new endpoint.

### Not changed, on purpose

- The server still does not announce that a computer finished starting. That would be the more
  complete fix (the browser would learn at once instead of within 3 seconds), but it touches the
  sandbox lifecycle code, and this change fixes only the stuck screen. It stays a future idea.
- The golden takeover end-to-end test is not changed. It is a correct test of a real problem.

### Upstream merge safety

New files wherever possible. Edits to existing upstream files:

| File | Edit |
|---|---|
| `apps/web/src/pages/Shell.tsx` | one hook call (a few lines) next to the other computer effects |

New: `apps/web/src/lib/computer-boot-watch.ts` and its test.

## Impact

- Capability: new `computer-panel` spec.
- No Prisma migration, no API change, no application behaviour change when the computer is already
  running.
- Cost: while stuck on "booting" with the view open, one status request every 3 seconds, bounded
  (see design.md).
