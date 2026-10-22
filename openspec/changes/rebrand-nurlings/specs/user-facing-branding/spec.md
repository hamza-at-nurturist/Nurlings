## ADDED Requirements

### Requirement: Product name in the web, desktop and mobile UIs
All text a person reads in the web app, the desktop app and the mobile app SHALL refer to the
product as the configured product name and SHALL NOT contain the upstream product name. This
covers page and window titles, sign-in and sign-up headings, the sidebar, onboarding, settings
copy, dialogs, menus, permission prompts and error messages that originate in these apps.

#### Scenario: Sign-in screens
- **WHEN** a signed-out user opens the web app, the desktop app or the mobile app
- **THEN** the sign-in and sign-up headings read "Sign in to Nurlings" and "Create your Nurlings" (or the equivalent localized heading) and the page title is "Nurlings"

#### Scenario: Whole web UI walk-through
- **WHEN** the web app is started and the main screens are visited (sign-in, onboarding, bot list, thread, settings, models, memory, usage)
- **THEN** no text rendered by the apps contains the upstream product name, and any server-supplied text that does is reported rather than hidden

#### Scenario: Desktop first-run setup
- **WHEN** the desktop app starts without a saved server
- **THEN** the setup window title, heading and button labels name Nurlings

#### Scenario: Mobile permission prompts
- **WHEN** the mobile app asks for camera, photo library, microphone, speech recognition or local network access
- **THEN** the system prompt text names Nurlings

### Requirement: Branded tagline
The login screen, the sidebar footer and the desktop About panel SHALL display the tagline
"Powered by Nurturist AI", sourced from the brand configuration.

#### Scenario: Login shows the tagline
- **WHEN** the login screen is displayed on web
- **THEN** the text "Powered by Nurturist AI" is visible

#### Scenario: About panel
- **WHEN** the user opens About in the desktop app
- **THEN** it shows the name "Nurlings", the app version, and "Powered by Nurturist AI"

### Requirement: Bot naming
Where UI copy names the product's agents in English, it SHALL use "Nurling" for one and
"Nurlings" for several, while identifiers (ids, query parameters, storage keys, API fields) are
unchanged.

#### Scenario: Plural copy
- **WHEN** a list screen with no results shows its empty state
- **THEN** the message uses "Nurlings" rather than "bots"

#### Scenario: Identifiers and similar words unchanged
- **WHEN** a bot id such as `bot-123`, a route parameter `botId`, or a word such as "robot" or "chatbot" is used
- **THEN** it keeps its upstream form
