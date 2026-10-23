# Design

## Evidence

From the failing run's trace and logs (the golden takeover end-to-end test):

- The end-to-end sandbox is the fake provider: the computer was provisioned in 98 ms and the run
  logged `ready=true` about 0.3 s after it started. Server-side, the computer was ready almost at
  once.
- In the browser, after pressing Open, the view showed "Booting live desktop…" for the full 120 s
  of the test. The "Take control" button renders only when the computer's state is `running`, so
  the browser's copy of the state stayed `booting`.
- After the press, the browser made no computer status or boot request. The only computer traffic
  was the 15-second image-update check. The Open handler deliberately returns early when it
  believes a start is already underway, and then relies on an event to flip the state.
- The server emits `computer.status` only when a computer is suspended
  (`packages/adapters/src/computer-idle.ts`). Nothing emits it when a start completes, so there is
  no event for the browser to have missed: the browser must look.

What is inferred, not observed: the exact moment the browser last read the state. The trace does
not keep the event stream. The roughly 0.2 s between the computer being marked booting and ready
is consistent with how rarely this happens.

## Options

1. **Server announces the end of a start** (emit `computer.status` when a computer becomes
   running or errors). Complete and immediate, but it changes sandbox lifecycle code shared with
   upstream and needs the events dependency in that code path. Larger blast radius.
2. **Browser re-checks while it shows "booting"** (chosen). Fixes the stuck screen whatever the
   cause (a missed read, a missed event, a slow start), touches one upstream file by one line, and
   cannot affect any state other than booting.

## Decision

Option 2. Option 1 remains a future improvement; the two are compatible, since the re-check would
simply find the state already updated.

## Behaviour of the re-check

- Runs only while the open computer view's computer state is `booting`, the tab is visible, and the
  browser has no start of its own in flight (that path already updates the state when it returns).
- Every 3 seconds it calls the page's existing refresh for that bot. For the active bot that is the
  existing thread refresh (which carries the computer status); otherwise the status request.
- Stops when the state is anything other than `booting`, the view closes, the bot changes, the tab
  hides (and resumes when it shows), or an error that retrying cannot fix occurs.
- Bounded: after 5 minutes of asking (hidden-tab ticks do not count) it stops. A start that long is not stuck on a missed
  read, and the existing boot-failure handling covers it.
- No overlapping requests: a tick is skipped while one is in flight.

## Test

Unit tests with fake timers: stuck booting then running recovers and stops; no polling when
running, closed, hidden, or with the browser's own start in flight; no overlapping requests; stops
on a non-retryable error; stops after the bound. The existing end-to-end test is the integration
check and needs no change.
