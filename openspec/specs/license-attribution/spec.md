# license-attribution Specification

## Purpose
Defines the legal and attribution rules of the fork: the upstream license file stays untouched, the notice credits the upstream project, and no upstream marks appear in Nurlings branding.

## Requirements

### Requirement: License file untouched
The original Apache-2.0 `LICENSE` file SHALL remain byte-for-byte identical to the upstream
repository's copy.

#### Scenario: LICENSE matches upstream
- **WHEN** `LICENSE` is compared with upstream's at the merge base
- **THEN** there is no difference

### Requirement: NOTICE attribution
The repository SHALL contain a `NOTICE` file stating that Nurlings is based on Rakazo by Elie
Steinbock, licensed under the Apache License 2.0, with a link to https://github.com/elie222/rakazo,
and identifying Nurturist AI as the publisher of Nurlings.

#### Scenario: NOTICE content
- **WHEN** `NOTICE` is read
- **THEN** it names Rakazo and Elie Steinbock, names the Apache-2.0 license, includes the original repository URL, and names Nurturist AI as publisher

### Requirement: No upstream marks in UI branding
The upstream name and logo SHALL NOT appear in the web, desktop or mobile UI branding: icons,
splash, favicons, wordmark and manifests. The upstream name may remain in `LICENSE`, `NOTICE`, and
in code identifiers, comments and files outside the customer-facing UI that this change does not
touch.

#### Scenario: Branding surfaces
- **WHEN** the icons, splash, favicons, wordmark and manifests of the three UIs are inspected
- **THEN** none shows the upstream logo, mascot or name
