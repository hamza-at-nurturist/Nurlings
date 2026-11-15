## ADDED Requirements

### Requirement: Upstream's logo icon set is not offered

The web and mobile bot icon pickers SHALL offer only the original shapes, with no set switcher, and
a stored "rakazo" icon set SHALL resolve to the original shapes, because the other set draws
upstream's logo.

#### Scenario: Avatar studio

- **WHEN** the user opens a Nurling's avatar studio
- **THEN** it shows shapes and colors and no icon-set tabs

### Requirement: A stored bot color carries only its hex

A bot color stored as `#hex::shape_N` SHALL be treated as the hex before `::` wherever a color is
looked up, including mention chips.

#### Scenario: Mention chip

- **WHEN** a Nurling with color `#8B5CF6::shape_3` is mentioned
- **THEN** the chip is `#8B5CF6`
