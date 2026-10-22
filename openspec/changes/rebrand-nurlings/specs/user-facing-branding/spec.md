## ADDED Requirements

### Requirement: Product name in user-visible text
All text a person reads in the product SHALL refer to the product as the configured product name
and SHALL NOT contain the upstream product name. This covers the web UI, window and page titles,
sign-in and onboarding screens, and error and status messages.

#### Scenario: Sign-in screens
- **WHEN** a signed-out user opens the web app, the desktop app or the mobile app
- **THEN** the sign-in and sign-up headings read "Sign in to Nurlings" and "Create your Nurlings" (or the equivalent localized heading) and the page title is "Nurlings"

#### Scenario: Whole UI walk-through
- **WHEN** the web app is started and the main screens are visited (sign-in, onboarding, bot list, thread, settings, models, memory, usage)
- **THEN** no visible text anywhere contains the upstream product name

### Requirement: Product name in server-generated text
Text generated outside the UI catalogs SHALL also use the configured product name: transactional
emails, messages sent to chat channels, model and billing descriptions in settings, in-product
update messages, and the client name shown on third-party OAuth consent screens.

#### Scenario: Account emails
- **WHEN** the system sends an email-verification, sign-in-code, password-reset or account-deletion email
- **THEN** the subject and body name Nurlings and none contains the upstream product name

#### Scenario: Third-party consent
- **WHEN** the product registers as an OAuth client with an external MCP server
- **THEN** the client name presented to the user on the provider's consent screen is "Nurlings"

### Requirement: Branded tagline
The footer, about content and login screen SHALL display the tagline "Powered by Nurturist AI"
where the product shows brand information, sourced from the brand configuration.

#### Scenario: Login shows the tagline
- **WHEN** the login screen is displayed on web
- **THEN** the text "Powered by Nurturist AI" is visible

### Requirement: Bot naming
Where UI copy names the product's agents in English, it SHALL use "Nurling" for one and
"Nurlings" for several, while identifiers (ids, query parameters, storage keys, API fields) are
unchanged.

#### Scenario: Plural copy
- **WHEN** a list screen with no results shows its empty state
- **THEN** the message uses "Nurlings" rather than "bots"

#### Scenario: Identifiers unchanged
- **WHEN** a bot id such as `bot-123` or a route parameter `botId` is used
- **THEN** it keeps its upstream form

### Requirement: Model-facing identity
Free-text instructions given to a model that name the product or its agents SHALL use the
configured names, so a bot that repeats its instructions does not name the upstream product.
Markers that persisted data or code matches literally SHALL keep their upstream text.

#### Scenario: System prompt identity
- **WHEN** the runtime builds the system prompt for a bot
- **THEN** the prompt identifies the agent as a "Nurling" and does not contain the upstream product name

#### Scenario: Stored history still recognised
- **WHEN** history that contains the persisted automated-message label is loaded
- **THEN** it is still recognised as an automated message
