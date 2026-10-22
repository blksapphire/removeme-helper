# RemoveMe Helper

A privacy-conscious app for finding personal-data listings and managing removal requests. The existing React/Vite interface remains manual-first; a self-hosted service prototype is being developed for supported provider workflows.

## Current web MVP

- Profile setup and editable removal-request templates.
- Searchable starter directory of people-search and marketing-data providers.
- Checklist, progress tracking, request statuses, follow-up dates, and notes.
- Opt-in localStorage persistence. The existing browser UI does not yet send profile data to a backend.
- Responsive dashboard for desktop and mobile.

## Run the web app

    npm install
    npm run dev

Build with npm run build.

## Self-hosted service prototype

The service folder contains a Node API, encrypted SQLite request store, and an experimental browser-assisted Spokeo opt-out flow. The API is not connected to the React UI yet. Only Spokeo is enabled for experimental submission; other providers remain manual-assisted until their current workflows and verification steps have been tested.

See service/README.md for setup. The backend must not be deployed publicly in its current form: it has a shared development token, not customer accounts or per-user authorization.

## Privacy and safety

- The current web app processes profile/template details in the browser and saves to localStorage only after opt-in.
- The prototype encrypts request payloads at rest, requires consent plus a separate explicit run action, and omits personal details from API status responses.
- The Spokeo adapter has not been live-smoke-tested. Email confirmation remains the user's step; submission does not mean removal.
- The service does not bypass CAPTCHA, phone verification, government identity checks, or other human steps.
- Coverage and legal rights vary by provider and jurisdiction. No removal is guaranteed.

## Not implemented yet

- Frontend integration with the API.
- Real user accounts and row-level authorization for public access.
- Live end-to-end adapter verification, scheduled monitoring, reminders, and source rechecks.
- Fully verified provider directory, retention/deletion policy, production queue/database, monitoring, and security review.

Finish these before selling or publicly exposing the service.