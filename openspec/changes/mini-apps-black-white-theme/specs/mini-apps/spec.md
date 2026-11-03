## ADDED Requirements

### Requirement: Mini apps draw on pure black or pure white

A mini app SHALL draw on a pure black surface in the dark theme and a pure white surface in the
light theme, following the theme switch, with the neutral palette of the shadcn components for its
text, borders and fills. Its cards SHALL sit on the same surface, set apart by a border. These
colors SHALL apply only inside the mini app: the rest of the screen SHALL keep the app's own theme.

#### Scenario: Dark theme

- **WHEN** a mini app is shown with the dark theme on
- **THEN** its background and its cards are pure black, and the app around it keeps its own colors

#### Scenario: Light theme

- **WHEN** the person switches to the light theme with a mini app open
- **THEN** its background and its cards become pure white, and the app around it keeps its own
  colors
