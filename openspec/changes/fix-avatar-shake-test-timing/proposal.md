# Proposal

## Why

The end-to-end test "shaking the pointer makes nearby avatars dizzy, but not far, sleeping or
thinking ones" fails on CI runners and passes on a developer machine (issue 96). The cause is in
the test, not the product:

- The shake detector counts direction changes inside a 1.5 second window of page time.
- The test moves the pointer 14 times and waits 40 ms between moves in real time. On a loaded
  runner each move and wait takes much longer, the moves spread past the window, and the detector
  never sees a shake, so the avatar is never dizzy.
- Reproduced locally by stretching the wait: it passes at 40 ms and 90 ms and fails at 130 ms with
  the same assertion CI reports.

## What Changes

The test now runs on Playwright's test clock and advances it 40 ms per move, so the shake always
fits the window however slow the runner is. The dizzy recovery check advances the clock past the
dizzy duration instead of waiting in real time. Every assertion stays as it was; nothing is
skipped or loosened.

Not changed: the product, the shake detector and its thresholds.

## Impact

- Capability: none. This is a test fix, so there is no spec delta.
- No application code.
