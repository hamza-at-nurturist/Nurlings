# artifacts-tab Specification

## Purpose

What the Artifacts tab lists by default and how dashboards in it read their live data.

## Requirements

### Requirement: The Artifacts tab shows what bots made by default

The Artifacts tab SHALL open filtered to files a bot made (files with a run), so files people
uploaded are hidden until the person chooses to see all files. Clearing filters SHALL return to
that default.

#### Scenario: Uploads are hidden on first open

- **WHEN** a person opens the Artifacts tab in a space that has both uploaded files and files a bot made
- **THEN** only the files a bot made are listed

#### Scenario: All files shows uploads

- **WHEN** the person picks "All files"
- **THEN** uploaded files are listed as well

### Requirement: Dashboards read their bot's JSON artifacts in the Artifacts tab

An HTML dashboard opened in the Artifacts tab SHALL be able to read a JSON artifact made by the
same bot by name, through the viewer relay, alongside any other messages the viewer passes.

#### Scenario: A dashboard loads its data

- **WHEN** a dashboard opened in the Artifacts tab asks for a JSON artifact its bot made
- **THEN** it receives that artifact's content
