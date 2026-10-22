## ADDED Requirements

### Requirement: Single brand configuration
The product SHALL define its brand in one configuration, and every surface (web, desktop, mobile,
API-generated text, marketing site) SHALL read brand values from it instead of embedding the
product name as a literal in code it newly authors.

#### Scenario: Name change is a one-file change
- **WHEN** the product name in the brand configuration is changed to another value and the apps are rebuilt
- **THEN** every user-visible occurrence of the product name on web, desktop, mobile, in emails and on the marketing site shows the new value without any other source edit

### Requirement: Brand configuration contents
The brand configuration SHALL contain the product name, the singular and plural bot names, the
tagline, the company name and URL, the product, docs, privacy, terms and repository URLs, the
native identifiers, the theme colours, and the paths of the logo and icon assets.

#### Scenario: Bot terms come from the configuration
- **WHEN** the singular bot name is "Nurling" and the plural is "Nurlings"
- **THEN** UI copy that refers to one bot says "Nurling" and copy that refers to several says "Nurlings"

#### Scenario: Invalid configuration is rejected
- **WHEN** a required field is missing or a URL is malformed
- **THEN** validation fails with a message naming the field, and the build does not proceed

### Requirement: Optional entries are hidden when unset
A brand URL that is not set (null) SHALL cause the UI entry that would link to it to be omitted,
not rendered as a dead or placeholder link. The community/support link, the hosted-cloud origin,
the iOS App Store link and the Android download link SHALL be unset by default.

#### Scenario: No community link
- **WHEN** the community URL is unset
- **THEN** no Discord or community link appears in the README, web app, desktop app, mobile app, marketing site or issue templates

#### Scenario: No hosted cloud choice
- **WHEN** the hosted-cloud URL is unset
- **THEN** the desktop first-run setup does not offer a hosted-cloud option and its default selection is a self-hosted or local option

### Requirement: Upstream strings are rebranded at load time
Translated UI strings inherited from upstream SHALL be rebranded when a catalog is loaded, so that
catalog files stay identical to upstream and strings added by later upstream merges are rebranded
without editing them.

#### Scenario: Every locale is rebranded
- **WHEN** each web and mobile locale catalog is loaded through the application's loader
- **THEN** no message in any locale contains the upstream product name as a word, and messages that contained it show the configured product name in the same position

#### Scenario: New upstream string
- **WHEN** a catalog message containing the upstream product name is added by an upstream merge
- **THEN** it is displayed with the configured product name with no change to the brand configuration or loader

### Requirement: Brand guard
The repository SHALL include an automated check that fails when the upstream product name is
visible in rendered or generated user-facing output, and that confirms the Apache-2.0 `LICENSE`
file is byte-identical to the original.

#### Scenario: Guard catches a leak
- **WHEN** a user-visible string containing the upstream product name outside the allowed attribution files is introduced
- **THEN** the guard check fails and names the offending string or file

#### Scenario: LICENSE integrity
- **WHEN** the guard runs
- **THEN** it fails if the `LICENSE` file differs from the original upstream copy
