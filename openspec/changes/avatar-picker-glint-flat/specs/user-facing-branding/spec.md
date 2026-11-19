## ADDED Requirements

### Requirement: Avatar effects are switches

The account settings on web, desktop and mobile SHALL offer three switches, Shadow, Glint and Eye
flare, in place of the Original and Nurlings choice. All three on SHALL be the default and SHALL
draw avatars as they were drawn before this change. Each switch SHALL apply to every avatar the
person sees, and turning all three off SHALL draw the flat look. Mobile SHALL use native switches
and web SHALL use the shared switch component.

#### Scenario: Turning an effect off on web

- **WHEN** a person turns Glint off in account settings
- **THEN** avatars in the sidebar, chat, inbox and bot panel draw without glint and still do after
  a reload

#### Scenario: Turning an effect off on mobile

- **WHEN** a person turns Shadow off on Settings, General
- **THEN** avatars draw without shadow and shading, and the setting syncs to web

#### Scenario: All effects off

- **WHEN** all three switches are off
- **THEN** avatars draw the body and eyes with no shading, glint or flare, and keep their
  states, props and motion

### Requirement: Existing avatar choices survive

The previous Original or Nurlings choice and every pinned bot SHALL keep rendering as stored. An
account with no saved effects SHALL have all effects on. A previous-release client or server SHALL
ignore the effects without error.

#### Scenario: Account from before the change

- **WHEN** an account saved before this change is shown
- **THEN** its avatars draw exactly as before and all switches are on

#### Scenario: Unknown effect value

- **WHEN** the saved effects contain an id this release does not know
- **THEN** it is ignored and the known effects apply
