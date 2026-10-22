## ADDED Requirements

### Requirement: Product links point to Nurlings
Every link a user can follow to the product's website, documentation, privacy policy, terms or
home page SHALL target the configured Nurlings URLs (https://nurlings.nurturistai.com for the
product and https://nurturistai.com for the company) and SHALL NOT target the upstream website.

#### Scenario: Footer and docs links
- **WHEN** the web app sidebar, marketing site footer and README links are inspected
- **THEN** none points at the upstream domain, and product links point at https://nurlings.nurturistai.com

### Requirement: Removed links
The product SHALL NOT link to the upstream Discord, the upstream GitHub repository (other than the
attribution in `NOTICE` and the README credit), the upstream cloud waitlist or hosted service, the
upstream App Store listing, or the upstream Android download, and SHALL NOT add a replacement
community link.

#### Scenario: No removed destinations
- **WHEN** the repository's user-visible content and generated output are searched for the upstream Discord invite, cloud/waitlist URLs and store/APK URLs
- **THEN** there are no matches

#### Scenario: Store links absent until configured
- **WHEN** the iOS and Android store URLs are unset
- **THEN** "Get the mobile app" style entries are not shown on web or the marketing site and the mobile force-update prompt does not open an upstream store page

### Requirement: No contact with upstream-owned infrastructure
A Nurlings build SHALL NOT send analytics or telemetry to the upstream operator, check the
upstream's releases or image registry for updates, receive over-the-air updates from the upstream
Expo project, or present the upstream as the origin of its HTTP requests.

#### Scenario: Analytics and error reporting
- **WHEN** no analytics or error-reporting environment variables are set
- **THEN** no analytics, error-reporting or log-shipping request is made, and no upstream key or DSN exists in the repository

#### Scenario: Desktop update check
- **WHEN** a packaged desktop app starts
- **THEN** it makes no request to the upstream releases, and automatic updates are inactive until the brand configuration enables them for Nurlings releases

#### Scenario: Server self-update
- **WHEN** an operator opens the in-product update status
- **THEN** the source shown and queried is the configured Nurlings repository or "no update source configured", never the upstream repository

#### Scenario: Outbound User-Agent
- **WHEN** a bot's web tool fetches a page
- **THEN** the User-Agent identifies "Nurlings" with the Nurlings site URL and not the upstream product or repository

### Requirement: Installer and image registries are explicitly deferred
The change SHALL NOT alter the published image registries or installer download location, and
SHALL document what must be built and hosted before they can be switched.

#### Scenario: Documented prerequisites
- **WHEN** the proposal and pull request are read
- **THEN** they list the images, installer script, Railway template and release pipelines that must be built and hosted under Nurturist AI accounts
