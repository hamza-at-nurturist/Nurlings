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
- **THEN** no text rendered by the apps contains the upstream product name, and any remaining server-supplied text that does is reported rather than hidden

#### Scenario: Desktop first-run setup
- **WHEN** the desktop app starts without a saved server
- **THEN** the setup window title, heading and button labels name Nurlings

#### Scenario: Mobile permission prompts
- **WHEN** the mobile app asks for camera, photo library, microphone, speech recognition or local network access
- **THEN** the system prompt text names Nurlings

### Requirement: Product name in account emails
The account emails the server sends (email verification, sign-in code, password reset, account
deletion) and the app and passkey names shown by the operating system SHALL use the configured
product name.

#### Scenario: Account emails
- **WHEN** the system sends an email-verification, sign-in-code, password-reset or account-deletion email
- **THEN** the subject, text and HTML bodies name Nurlings and none contains the upstream product name

### Requirement: Product name in other server text
Other text a dedicated server generates for its users SHALL use the configured product name:
chat-channel messages (group introduction, linked-conversation invitation, delegated-request
failure), in-product update messages, model and billing descriptions in settings, and the client
name sent when registering with an external MCP server. The change SHALL be text only:
identifiers, environment variables, protocol markers and internal error strings SHALL NOT change.

#### Scenario: Chat-channel invitation
- **WHEN** a conversation is linked to a user's agent and the user is asked to confirm
- **THEN** the message names Nurlings and still asks the user to reply YES or NO

#### Scenario: Model and billing descriptions
- **WHEN** the model settings list a provider's billing description
- **THEN** it names Nurlings, for example "Uses your OpenAI API key. Nurlings does not pay for model usage."

#### Scenario: MCP registration name
- **WHEN** the server registers as an OAuth client with an external MCP server
- **THEN** the client name sent is "Nurlings"

#### Scenario: Identifiers unchanged
- **WHEN** the changed server strings are compared with upstream's
- **THEN** only human-readable product-name text differs; ids, headers, env var names and the persisted automated-message label are identical

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
