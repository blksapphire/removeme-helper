# RemoveMe Helper

A privacy-conscious, manual-first workspace for organizing personal-data removal efforts.

## Current MVP

- Profile wizard for name, email, country/region, and name variants.
- A practical checklist to organize discovery, removal requests, and follow-up.
- Searchable starter directory with official-domain opt-out links for several US people-search and marketing-data services.
- One-click tracking: add a directory entry to the removal checklist without submitting anything.
- Editable removal-request template with copy-to-clipboard support.
- Custom checklist items, search, filters, and progress tracking.
- Per-task request tracking with statuses (Not started, In progress, Submitted, Awaiting response, Removed, Rejected, Unable to verify), submission date, follow-up date, confirmation/reference details, and outcome notes.
- Request tracking remains local to the browser and never submits requests or sends reminders automatically.
- Optional browser-local persistence. The user must opt in before profile/checklist data is stored in localStorage.
- Clear-workspace action to remove locally saved application data.
- Responsive dashboard for desktop and mobile.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Privacy and safety boundaries

- The app does not automatically search data brokers, submit opt-out requests, or contact third parties.
- Profile details and generated template text are processed in the browser.
- The app stores data in localStorage only after the user opts in. Anyone with access to the same browser profile may be able to access local browser storage.
- The starter search link opens Google; a search provider may receive normal request metadata and search terms the user enters there.
- Do not upload identity documents or sensitive information to a broker until the recipient and official process have been verified.
- This is an organizer and template helper, not legal advice. Removal rights and verification requirements vary by country and service.

## Not implemented yet

- Live-tested and maintained directory of data brokers and official opt-out routes. Current starter links are clearly marked as needing live review.
- Scheduled reminders/notifications and a full audit trail of status changes.
- Server account system, cloud sync, or automated submissions.
- Formal legal/region-specific request guidance.

These should be added deliberately, with official-source verification and explicit user consent, rather than presenting unverified broker information as authoritative. The directory currently labels all routes as needing review and includes a visible warning that links have not been individually live-tested for this release.


## Self-operated removal service (first integration)

The application includes a server-side LiveRamp connector. It can submit opt-out or eligible-state deletion requests through LiveRamp's documented Privacy API and refresh provider status. This is separate from the starter directory: other directory entries remain manual until their request flows have been verified and integrated.

### Run locally

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env`.
3. Generate an encryption key with `openssl rand -hex 32` and set `DATA_ENCRYPTION_KEY` in `.env`.
4. Set `LIVERAMP_ACCOUNT_ID`, `LIVERAMP_SECRET_KEY`, and `LIVERAMP_ORG_ID` only after obtaining legitimate API access. The server obtains and refreshes short-lived access tokens automatically; never put account credentials in frontend variables. Set `LIVERAMP_AGENT_AUTHORIZED=true` only after confirming the organization and authorized-agent workflow are approved for this use.
5. Run `npm install`, then `npm run dev:api` in one terminal and `npm run dev` in another.

Vite proxies `/api` to port 8787. For production, `docker compose up --build -d` runs the built app and API on port 8787 with persistent SQLite storage.

### Service boundaries

- LiveRamp's official documentation says its Privacy API is available only to U.S. customers. Use it only after the organization has obtained legitimate API access from LiveRamp. See the [official API overview](https://developers.liveramp.com/privacy-api/reference/about-the-privacy-api).
- An API acknowledgement means **submitted**, not **removed**. The UI reports provider status and does not claim independent removal verification.
- LiveRamp is disabled unless the service-account credentials, organization ID, encryption key, and explicit agent-authorization configuration are present.
- **Not ready for public deployment:** the request-creation endpoint does not yet require an authenticated RemoveMe Helper account. Keep the API private and `LIVERAMP_AGENT_AUTHORIZED=false` until account authentication, per-request authority checks, rate limiting/abuse controls, and a legal/contractual review are in place.
- The app sends name and email directly to LiveRamp for the requested action. Our database does not store those fields; it stores the provider reference, status events, and an encrypted authorization receipt.
- The authorization checkbox and typed signature are versioned and timestamped. Review the consent wording, applicable privacy rules, LiveRamp API access terms, and authorized-agent obligations before enabling this integration for public users.
- Other directory entries are not automatically submitted yet. A site is not labelled automated until its connector has been implemented and tested against the current official process.
- Never bypass CAPTCHA, identity verification, or provider access controls.
