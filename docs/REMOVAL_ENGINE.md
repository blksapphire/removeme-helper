# RemoveMe Helper: removal-engine plan

## Product direction

Move from a link directory to a privacy service that manages authorized removal jobs, supports selected submission workflows, and tracks outcomes. External routes remain as fallbacks wherever human verification, CAPTCHA, phone calls, or government identity checks are required.

## Capability tiers

1. Automated: only after the live provider flow has passed end-to-end testing and a reliable completion signal exists.
2. Browser-assisted: fill or submit the supported part, then pause for human verification, email confirmation, or uncertain outcomes.
3. Manual-assisted: official instructions and tracking without claiming that our service submits anything.
4. Official external workflow: the user completes government and identity checks directly.

## Current increment

- Local API, SQLite jobs, AES-256-GCM encrypted payloads, allow-listed provider IDs/hostnames and explicit consent.
- Experimental Spokeo adapter. It refuses to bypass human checks, and email confirmation remains a user action.
- Whitepages, BeenVerified and PeopleFinders are disabled for automation pending live workflow tests.
- California DROP remains a user-completed government workflow for eligible California residents. Official information: https://privacy.ca.gov/drop/ and https://privacy.ca.gov/drop/how-drop-works/.

## Development sequence

### Local backend foundation

Encrypt profile data and listing URLs at rest. Bind to localhost. Keep create and submit separate. Restrict target URLs to verified providers. Distinguish queued, running, awaiting confirmation, submitted-needs-review, and manual-action-required states.

### Frontend integration and provider testing

Add a Start removal action separate from the existing Track action. Let users review the exact listing and information being sent. Smoke-test using the developer's own record; maintain stable mocked tests and route review dates. Never log names, emails, listing URLs, tokens, or encrypted payloads.

### Secure public service

Add real per-user auth and row-level authorization before public deployment. Use a managed database, queue, secret manager, key rotation, encrypted backups, rate limits, monitoring and abuse controls. Define data-retention and deletion rules. Treat email/identity verification as explicit states and avoid blind retries. Review privacy notices and jurisdiction-specific processes.

### Expand provider coverage

Add a provider only after an end-to-end test confirms an authorized request can be sent via its current official process and outcomes can be checked. Record official evidence, review date, required fields, human steps, test status and limitations. A directory entry is not proof a person is listed or data has been removed.

## Reliability and privacy gates

- Never bypass CAPTCHA, access controls, or identity verification.
- Never submit another person's information without documented permission.
- Minimize, encrypt and delete retained data when no longer needed.
- Do not log personally identifying request content.
- Never claim removal merely because a submit button was clicked.
- Do not expose the local prototype to the public internet: a shared token is not multi-user authentication.