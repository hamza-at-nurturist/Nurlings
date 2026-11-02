## ADDED Requirements

### Requirement: Account emails are rebranded in every language

Account emails SHALL be written in the recipient's language and SHALL carry the brand's product
name and agent nouns in every language, with the rebranding applied to the message template before
placeholders are filled so that a person's own name is never rewritten.

#### Scenario: A localized email names the brand

- **WHEN** any account email is rendered in English or Spanish
- **THEN** its subject, text and HTML do not contain the upstream product name

### Requirement: The desktop shell is rebranded in every language

Messages the desktop shell shows, in any language it ships, SHALL carry the brand's product name,
and the macOS permission prompts it installs SHALL name the brand, not the upstream product.

#### Scenario: A translated desktop message names the brand

- **WHEN** the desktop shell shows a message in Spanish
- **THEN** it names the brand, not the upstream product

### Requirement: No prompt to promote the upstream project

The apps SHALL NOT ask people to star, follow or otherwise promote the upstream repository.

#### Scenario: Sending messages never opens the upstream repository prompt

- **WHEN** a person sends more than five messages in the web app
- **THEN** no prompt linking to the upstream repository appears
