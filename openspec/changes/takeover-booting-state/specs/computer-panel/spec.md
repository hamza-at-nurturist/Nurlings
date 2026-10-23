## ADDED Requirements

### Requirement: A booting computer view recovers on its own
While the open computer view shows the computer as booting and the browser has no start of its own
in flight, the web app SHALL re-check the computer's status about every three seconds, SHALL show
the normal view or the failure as soon as the status is no longer booting, and SHALL stop checking
when the status changes, the view closes, the tab is hidden, an error that retrying cannot fix
occurs, or five minutes have passed. It SHALL NOT make these requests when the computer is not
booting.

#### Scenario: A finish that was never announced
- **WHEN** the view shows "Booting live desktop…" and the computer has in fact finished starting
- **THEN** within about three seconds the view shows the running computer, including its "Take control" button

#### Scenario: Already running
- **WHEN** the computer is running
- **THEN** no re-check requests are made

#### Scenario: Hidden tab
- **WHEN** the browser tab is hidden while the view says booting
- **THEN** no re-check requests are made until it is visible again

#### Scenario: A start of its own
- **WHEN** the browser itself asked for the start and is waiting for the answer
- **THEN** the re-check does not run alongside it
