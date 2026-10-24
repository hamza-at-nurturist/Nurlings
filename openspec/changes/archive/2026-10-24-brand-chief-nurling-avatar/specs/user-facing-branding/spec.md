## ADDED Requirements

### Requirement: The brand blob is an avatar shape
The brand mark's blob and its two slanted pill eyes SHALL be one of the shipped avatar shapes,
drawn through the same code, with the same colour picker, animations and sizes as every other
shape, on the web, desktop and mobile apps. It SHALL be offered wherever the other shapes are
offered, including the create-bot picker and the Avatar Studio, and its stored value SHALL be an
ordinary `#hex::shape_N` value with no reserved or special-cased avatar value.

#### Scenario: Picked like any other shape
- **WHEN** a person opens the create-bot picker or the Avatar Studio
- **THEN** the brand blob is listed with the other shapes and, once picked, takes the chosen colour

#### Scenario: Behaves like any other shape
- **WHEN** a bot using the brand blob is idle or working
- **THEN** it shows the same working ring and glow, and its eyes blink and look around with the same animation, as any other shape

#### Scenario: Visual weight
- **WHEN** the brand blob is shown at the same size as another shape
- **THEN** it is drawn large enough to read at the same weight without extending past the shared view box

### Requirement: The default Chief wears the brand blob
The first bot created at sign-up SHALL use the brand blob shape in the default avatar colour.

#### Scenario: New sign-up
- **WHEN** a new account finishes onboarding and its first bot, Chief, is created
- **THEN** Chief's avatar is the brand blob in the default avatar colour
