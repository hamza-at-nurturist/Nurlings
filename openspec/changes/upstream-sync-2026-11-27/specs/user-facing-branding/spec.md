## ADDED Requirements

### Requirement: Lifecycle emails use the product's own wording

The welcome, referral, model-connection and agent-import emails SHALL be sent in the configured
product's name from its own English wording when the deployment supplies no email copy folder, and
from the folder's copy when it does. They SHALL link to no upstream site, community or repository.

#### Scenario: No copy folder

- **WHEN** the server runs without `EMAIL_COPY_DIR` and sends a welcome email
- **THEN** the subject and body name Nurlings, and the email has no Discord, star or upstream link

#### Scenario: Another language

- **WHEN** a person whose app language has no copy for an email receives it
- **THEN** the email is written in English
