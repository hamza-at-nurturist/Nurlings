# bot-panel Specification

## Purpose
TBD - created by archiving change bot-panel-expand. Update Purpose after archive.

## Requirements

### Requirement: A bot's settings panel can fill the main area

The web app SHALL let a person expand a bot's settings panel, with its Computer, Routines and
Advanced tabs, to fill the main content area over the chat, and collapse it again. The control
SHALL have accessible names and no visible text.

#### Scenario: Expanding the panel

- **WHEN** a person chooses the expand button in the header of a bot's settings panel
- **THEN** the panel covers the chat, the bots sidebar stays visible, and the button's accessible
  name becomes the collapse name

#### Scenario: Collapsing with the button

- **WHEN** the panel is expanded and the person chooses the same button
- **THEN** the panel returns to its previous width beside the chat

#### Scenario: Collapsing with Escape

- **WHEN** the panel is expanded and the person presses Escape with no dialog, menu or text edit
  handling it
- **THEN** the panel returns to its previous width and stays open

#### Scenario: Escape belongs to what is open

- **WHEN** the panel is expanded and a dialog, menu or the name field is handling Escape
- **THEN** that element closes first and the panel stays expanded

#### Scenario: Closing resets the panel

- **WHEN** the panel is expanded and the person closes it, or opens another bot's panel
- **THEN** the next time a bot's panel opens it has its normal width

#### Scenario: Other panels

- **WHEN** a group, routine, create-group or import panel is open
- **THEN** it has no expand button
