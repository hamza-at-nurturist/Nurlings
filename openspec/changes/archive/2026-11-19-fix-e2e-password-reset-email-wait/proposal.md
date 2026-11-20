# Proposal

## Why

The end-to-end test "changes and recovers an email password" failed once on `main` with the sign-in
page where the reset page should be, on a commit that touched no web code. The cause is in the
test, not the product:

- Test mail goes to one inbox shared by every test on the server, and sign-up and sign-in already
  put verification mail in it.
- The password-reset mail is sent after the request has returned, on purpose, so response timing
  does not reveal whether an account exists.
- The test waited until the inbox held any mail, then opened the link in the last message. When the
  reset mail had not landed yet, the last message was the verification mail, whose link returns to
  the sign-in page.

## What Changes

The test now polls the inbox until a message to its own address links to the reset page, and opens
that link. No wait is lengthened. The check that the inbox response is not cached stays, now on
every read.

Not changed: the product, the inbox emulator, and the order or timing of any email.

## Impact

- Capability: none. This is a test fix, so there is no spec delta.
- No application code.
