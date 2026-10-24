## ADDED Requirements

### Requirement: The brand blob avatar behaves like an organic avatar
The brand blob avatar shape (shape 8) SHALL behave like an organic avatar in every state on web and
mobile, keeping its logo silhouette and slanted pill eyes: no working ring or dot on web, the organic
working-state animation and glow, the organic idle eye patterns and blinks, and the organic sizing,
hover and reduced-motion behaviour. Its stored value SHALL stay `#hex::shape_8`, and the other
shapes SHALL be unchanged.

#### Scenario: Working
- **WHEN** a bot using the brand blob is working
- **THEN** it shows the organic working state (working eyes and body animation, glow) and no spinning ring or dot

#### Scenario: Idle
- **WHEN** a bot using the brand blob is idle
- **THEN** its eyes follow the idle pattern and blinks chosen from the bot's identity, as an organic avatar's do

#### Scenario: Reduced motion
- **WHEN** the person prefers reduced motion
- **THEN** the brand blob does not animate

#### Scenario: Existing Chiefs
- **WHEN** a bot already stores `#hex::shape_8`
- **THEN** it renders the brand blob in the same colour with no data change

#### Scenario: Other shapes unchanged
- **WHEN** a bot uses any other shipped shape
- **THEN** it renders as before
