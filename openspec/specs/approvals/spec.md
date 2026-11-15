# approvals Specification

## Purpose

Defines how a Nurling's gated actions are approved: a member who never saved an Auto Review preference is asked first, and turning Auto on lets the reviewer decide.

## Requirements

### Requirement: Auto Review is off until the member turns it on

A member who never saved the setting SHALL be asked before a gated action runs. The default SHALL
be one value read by the account settings, by the run, and by the first save.

#### Scenario: New member

- **WHEN** a member with no saved Auto Review preference has a Nurling attempt a gated action
- **THEN** the run asks the member instead of letting a reviewer decide

#### Scenario: Turned on

- **WHEN** the member turns Auto on
- **THEN** the reviewer decides as before
