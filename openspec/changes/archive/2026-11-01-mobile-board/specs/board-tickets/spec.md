## ADDED Requirements

### Requirement: Ticket notifications carry the ticket
A push notification sent for a ticket, when a Nurling mentions the user or a ticket becomes
overdue, SHALL include the ticket's id in its data so a client can open the ticket. The
notification's other data and its rules (sent only when the Nurling notifies on finish) SHALL
NOT change, and a client that ignores the id SHALL still be able to open the Nurling's chat.

#### Scenario: Mention push
- **WHEN** a Nurling mentions the user on a ticket and sends a push
- **THEN** the push data includes that ticket's id as well as the Nurling and thread ids

#### Scenario: Overdue push
- **WHEN** a ticket becomes overdue and the user is notified
- **THEN** the push data includes that ticket's id

#### Scenario: Chat push
- **WHEN** a push is sent for a chat completion
- **THEN** its data has no ticket id
