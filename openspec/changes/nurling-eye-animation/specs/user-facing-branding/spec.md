## ADDED Requirements

### Requirement: The brand blob's eyes move like organic avatars' eyes
On the web app, the brand blob avatar shape SHALL animate its eyes the way organic avatars do while
keeping its slanted pill eyes: an idle pattern seeded per bot, blinks, a separate working-state eye
animation, and no eye animation when the person prefers reduced motion. Mobile SHALL give it the
same eye behaviour as every other shape.

#### Scenario: Idle
- **WHEN** a bot using the brand blob is idle and the person has not asked for reduced motion
- **THEN** its eyes drift and blink on the idle pattern chosen from the bot's identity, as an organic avatar's eyes do

#### Scenario: Working
- **WHEN** a bot using the brand blob is working
- **THEN** its eyes switch to the working-state animation used by organic avatars

#### Scenario: Reduced motion
- **WHEN** the person prefers reduced motion
- **THEN** the brand blob's eyes do not animate

#### Scenario: Other shapes unchanged
- **WHEN** a bot uses any shape other than the brand blob
- **THEN** its eyes behave as before
