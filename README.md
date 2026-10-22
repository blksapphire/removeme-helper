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
