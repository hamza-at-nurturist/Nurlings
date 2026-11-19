## ADDED Requirements

### Requirement: Account settings offer glint or flat

The bot style control in account settings on web, desktop and mobile SHALL offer two options,
Glint and Flat, in place of Original and Nurlings. Glint SHALL be the default.

#### Scenario: Opening the control

- **WHEN** a person opens the bot style control for the first time
- **THEN** it shows Glint and Flat with Glint selected

### Requirement: Flat avatars draw without effects

Glint SHALL draw avatars as they were drawn before this change. Flat SHALL draw every avatar without
its effects: no catchlights or gloss on organic bodies, and no shading, shadows, eye glint or eye
sheen on the logo avatar. The choice SHALL apply to every avatar the person sees, with or without a
picked shape, and SHALL NOT change a body, colour, state, prop or motion.

#### Scenario: Choosing flat on web

- **WHEN** a person chooses Flat in account settings
- **THEN** avatars in the sidebar, chat, inbox and bot panel draw without effects, including bots
  with a picked shape, and still do after a reload

#### Scenario: Choosing flat on mobile

- **WHEN** a person chooses Flat on Settings, General
- **THEN** avatars draw without effects and the choice syncs to web

#### Scenario: Choosing glint again

- **WHEN** a person who chose Flat chooses Glint
- **THEN** avatars draw with their effects as before

### Requirement: Existing avatar choices survive

An account with no saved choice SHALL be on Glint. Stored account and per-bot icon sets and pins
SHALL keep rendering as they do, and settings SHALL NOT offer the `rakazo` set. A previous-release
client or server SHALL ignore the choice without error.

#### Scenario: Account from before the change

- **WHEN** an account saved before this change is shown
- **THEN** its avatars draw exactly as before and Glint is selected

#### Scenario: Unknown saved value

- **WHEN** the saved value is one this release does not know
- **THEN** it is treated as Glint
