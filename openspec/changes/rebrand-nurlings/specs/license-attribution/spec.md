## ADDED Requirements

### Requirement: License file untouched
The original Apache-2.0 `LICENSE` file SHALL remain byte-for-byte identical to the upstream
repository's copy.

#### Scenario: LICENSE matches upstream
- **WHEN** `LICENSE` is compared with upstream's at the merge base
- **THEN** there is no difference

### Requirement: NOTICE attribution
The repository SHALL contain a `NOTICE` file stating that Nurlings is based on Rakazo by Elie
Steinbock, licensed under the Apache License 2.0, with a link to https://github.com/elie222/rakazo,
and that the Rakazo name and logo are not used to endorse or brand Nurlings.

#### Scenario: NOTICE content
- **WHEN** `NOTICE` is read
- **THEN** it names Rakazo and Elie Steinbock, names the Apache-2.0 license, includes the original repository URL, and identifies Nurturist AI as the publisher of Nurlings

### Requirement: No upstream marks in branding
The upstream name and logo SHALL NOT appear in product branding. The only places the upstream name
may appear are `LICENSE`, `NOTICE`, the README credit line, and the code identifiers and comments
that are kept internal on purpose.

#### Scenario: Branding surfaces
- **WHEN** icons, splash, favicons, wordmark, store metadata and social images are inspected
- **THEN** none shows the upstream logo, mascot or name

### Requirement: README for Nurlings
The README SHALL describe Nurlings (what it is, setup), carry the "Powered by Nurturist AI" line
and a link to https://nurlings.nurturistai.com, and include a short credit to Rakazo near the
bottom.

#### Scenario: README structure
- **WHEN** the README is read
- **THEN** its title is Nurlings, it links to https://nurlings.nurturistai.com, it says "Powered by Nurturist AI", and the only mention of Rakazo is the credit line near the bottom
