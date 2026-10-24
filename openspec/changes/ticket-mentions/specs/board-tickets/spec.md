## ADDED Requirements

### Requirement: Mention a Nurling from the reply box
In the ticket modal's reply box, typing `@` SHALL open a picker of the space's Nurlings. Choosing one
SHALL add a name chip to the reply and `@Name` to its text, and sending SHALL record the mention
with the comment. Chips SHALL render in the feed. A Nurling's chip SHALL use that Nurling's own hex
color, taken before any `::`, as a tinted background with the name in full color; if the color is not
a hex value, or for a user, the chip SHALL be neutral.

#### Scenario: Open the picker
- **WHEN** the user types `@` in the reply box and the space has Nurlings
- **THEN** a picker lists them, narrows as the user types, and picking one adds its chip

#### Scenario: Chip color
- **WHEN** a comment mentions a Nurling whose color is `#7C3AED::shape_8`
- **THEN** its chip is tinted with `#7C3AED` and its name is shown in `#7C3AED`

#### Scenario: Neutral chip
- **WHEN** a comment mentions a user, or a Nurling whose color is not a hex value
- **THEN** its chip is neutral

### Requirement: A user mention wakes a non-owner for that ticket only
A user's comment that mentions a Nurling that is not the ticket's owner SHALL start a run of that
Nurling, whose prompt tells it to read the ticket and reply with one comment. In that run the Nurling
SHALL NOT be able to update the ticket in any way (status, owner, title, description, priority or
any other field), and SHALL NOT be able to post a second comment on the ticket. The ticket's owner SHALL remain unchanged.

#### Scenario: Ask another Nurling
- **WHEN** a user comments on an open ticket mentioning a Nurling that is not the owner
- **THEN** that Nurling starts a run for the ticket

#### Scenario: Comment only
- **WHEN** a Nurling woken by a mention calls `ticket_update` on the ticket, for any field
- **THEN** the call is refused and the ticket is unchanged

#### Scenario: Other tickets and an owner's own runs
- **WHEN** a mention-woken Nurling updates a different ticket, or the owner updates its own ticket in an ordinary run
- **THEN** the update is allowed

#### Scenario: One reply
- **WHEN** a Nurling woken by a mention tries to post a second comment on the ticket
- **THEN** the second comment is refused

#### Scenario: Finished ticket
- **WHEN** a mention is made on a done or closed ticket
- **THEN** no run is started

#### Scenario: Not a Nurling of the user
- **WHEN** a mention names a Nurling that is archived, in another space, or another user's
- **THEN** it wakes nothing and renders as plain text

### Requirement: Nurlings can mention each other
A Nurling SHALL be able to mention other Nurlings, and the user, in a ticket comment through
`ticket_comment`. A mention of a Nurling by a Nurling SHALL start a run of the mentioned Nurling for
the ticket, and a mention of the owner by another Nurling SHALL wake the owner as a normal ticket
wake.

#### Scenario: Owner asks for help
- **WHEN** the owner comments on its ticket mentioning an idle Nurling
- **THEN** that Nurling starts a run for the ticket

#### Scenario: Nurling asks the owner
- **WHEN** a Nurling that is not the owner comments on the ticket mentioning the owner
- **THEN** the owner starts a normal ticket run

### Requirement: Wakes started by a Nurling are bounded
A mention by a Nurling SHALL NOT wake the commenting Nurling itself, SHALL NOT wake a Nurling that is
already working on the ticket, and SHALL be limited to 10 wakes per ticket per hour; beyond the limit
the comment is stored and no run starts. Mentions by a user SHALL NOT be subject to the working check
or the limit.

#### Scenario: Already working
- **WHEN** a Nurling mentions a Nurling that has a queued, leased or running run for the same ticket
- **THEN** no new run is started

#### Scenario: Cap
- **WHEN** ten wakes started by Nurling mentions have been made on a ticket within the last hour
- **THEN** a further Nurling mention on that ticket starts no run

#### Scenario: Self mention
- **WHEN** a Nurling mentions itself
- **THEN** no run is started

#### Scenario: A user is not limited
- **WHEN** a user mentions a Nurling that is already working on the ticket, after ten Nurling-started wakes
- **THEN** the mention is handled as any user mention, without the working check or the limit

### Requirement: A Nurling mentioning the user notifies them
A Nurling's comment that mentions the user SHALL send the user a notification naming the Nurling and
the ticket, with the start of the comment, if the Nurling's notify-on-finish setting is on.

#### Scenario: Notify
- **WHEN** a Nurling comments on a ticket mentioning the user and its notify-on-finish setting is on
- **THEN** the user receives a notification titled "{Nurling} mentioned you on {ref}"

#### Scenario: Setting off
- **WHEN** the Nurling's notify-on-finish setting is off
- **THEN** the comment and its chip are stored and shown, and no notification is sent

### Requirement: One owner per ticket
A ticket SHALL keep exactly one owner. A mention SHALL NOT assign, share or change ownership.

#### Scenario: Mention does not reassign
- **WHEN** a Nurling that is not the owner is mentioned and replies
- **THEN** the ticket's owner is unchanged
