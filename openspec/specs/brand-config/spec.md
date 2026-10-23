# brand-config Specification

## Purpose
Defines the single brand configuration that every Nurlings name, link, colour, asset path and registry value is read from, how unset entries are hidden, how upstream strings are rebranded at load time, and the guard that enforces it.

## Requirements

### Requirement: Single brand configuration
The product SHALL define its customer-facing brand in one configuration, and the web, desktop and
mobile UIs and the server text that clients read SHALL take brand values from it instead of
embedding the product name as a literal in code they newly author.

#### Scenario: Name change is a one-file change
- **WHEN** the product name in the brand configuration is changed to another value and the apps are rebuilt
- **THEN** every user-visible occurrence of the product name in the web, desktop and mobile UIs and in server-generated emails and messages shows the new value without any other source edit

### Requirement: Brand configuration contents
The brand configuration SHALL contain the product name, the singular and plural names for a bot,
the tagline, the company name and URL, the product site URL, the mobile bundle identifier, the
container image registry prefix, the theme colours, the paths of the logo and icon assets, and
feature flags that keep the desktop auto-updater, mobile OTA updates and server self-update off.

#### Scenario: Bot terms come from the configuration
- **WHEN** the singular bot name is "Nurling" and the plural is "Nurlings"
- **THEN** UI copy that refers to one bot says "Nurling" and copy that refers to several says "Nurlings"

#### Scenario: Invalid configuration is rejected
- **WHEN** a required field is missing, a URL is malformed, or the registry prefix is not lowercase
- **THEN** validation fails with a message naming the field, and the build does not proceed

#### Scenario: Registry prefix is lowercase
- **WHEN** the registry prefix contains an uppercase character
- **THEN** validation fails naming the registry field, so a mixed-case repository name can never produce an invalid image reference

### Requirement: Optional entries are hidden when unset
A brand URL that is not set (null) SHALL cause the UI entry that would link to it to be omitted,
not rendered as a dead or placeholder link. The community link, the hosted-cloud origin, the iOS
App Store link and the Android download link SHALL be unset by default.

#### Scenario: No community link
- **WHEN** the community URL is unset
- **THEN** no Discord or community link appears in the web, desktop or mobile UI

#### Scenario: No store links
- **WHEN** the iOS and Android store URLs are unset
- **THEN** "Get the mobile app" is not shown in the web app and the mobile update prompt does not open an upstream store page

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
visible in the rendered web and mobile catalogs, the generated desktop, mobile and web identity, or
the server-generated emails and messages; that confirms every compose file's image default equals
the configured registry prefix; and that confirms `LICENSE` is byte-identical to upstream's.

#### Scenario: Guard catches a leak
- **WHEN** a user-visible string containing the upstream product name is introduced in a checked surface
- **THEN** the guard check fails and names the offending string or file

#### Scenario: Registry drift
- **WHEN** a compose file or the env example names an image prefix different from the configured registry
- **THEN** the guard check fails and names the file

#### Scenario: LICENSE integrity
- **WHEN** the guard runs
- **THEN** it fails if the `LICENSE` file differs from the upstream copy

### Requirement: Ticket prefix comes from the brand configuration
The brand configuration SHALL define the ticket prefix that new boards start with, and a board
created without an explicit prefix SHALL use it. Renaming a board's prefix SHALL keep working as
before.

#### Scenario: New board
- **WHEN** a space opens its board for the first time
- **THEN** its tickets are referenced as `NUR-1`, `NUR-2` and so on

#### Scenario: Invalid prefix is rejected
- **WHEN** the configured ticket prefix is empty, starts with a digit, contains a symbol, or is longer than a board prefix may be
- **THEN** brand validation fails with a message naming `ticketPrefix`, and the build does not proceed
