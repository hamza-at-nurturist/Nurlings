## MODIFIED Requirements

### Requirement: Brand configuration contents
The brand configuration SHALL contain the product name, the singular and plural names for a bot,
the tagline, the company name and URL, the product site URL, the mobile bundle identifier, the
container image registry prefix, the theme colours, the paths of the logo and icon assets, and
feature flags that keep the desktop auto-updater and mobile OTA updates off.

#### Scenario: Bot terms come from the configuration
- **WHEN** the singular bot name is "Nurling" and the plural is "Nurlings"
- **THEN** UI copy that refers to one bot says "Nurling" and copy that refers to several says "Nurlings"

#### Scenario: Invalid configuration is rejected
- **WHEN** a required field is missing, a URL is malformed, or the registry prefix is not lowercase
- **THEN** validation fails with a message naming the field, and the build does not proceed

#### Scenario: Registry prefix is lowercase
- **WHEN** the registry prefix contains an uppercase character
- **THEN** validation fails naming the registry field, so a mixed-case repository name can never produce an invalid image reference
