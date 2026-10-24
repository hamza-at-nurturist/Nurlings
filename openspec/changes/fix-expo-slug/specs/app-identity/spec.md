## MODIFIED Requirements

### Requirement: Mobile bundle identifier
The iOS bundle identifier and the Android package SHALL both be `com.nurturistai.nurlings`, taken
from the brand configuration. The Expo slug SHALL be `nurlings`, matching the Nurlings Expo
project. The `rakazo://` URL scheme, the desktop application id and the Linux executable name
SHALL NOT change.

#### Scenario: Resolved Expo config
- **WHEN** the Expo configuration is resolved
- **THEN** `ios.bundleIdentifier` and `android.package` are `com.nurturistai.nurlings`, `slug` is `nurlings` and `scheme` is `rakazo`

#### Scenario: Other identifiers preserved
- **WHEN** the desktop builder `appId` and the Linux `executableName` are compared with upstream's
- **THEN** they are identical
