# RemoveMe Helper service prototype

This folder adds a self-hosted Node.js service beside the existing React/Vite UI. This is a localhost, single-operator prototype, not a public multi-user SaaS backend.

## Implemented

- SQLite request jobs; name, email, consent, country and exact listing URL are encrypted at rest with AES-256-GCM.
- Separate explicit consent for processing and authorization to submit each request.
- Fixed provider IDs and official host allow-lists; no arbitrary target URLs.
- Separate queue and run actions. Creating a job never submits it.
- Experimental Playwright adapter for Spokeo. It stops on unexpected domains, anti-bot checks, missing form fields, or changed submit controls. It does not bypass CAPTCHA.
- Conservative statuses: awaiting email confirmation, submitted but needs review, or needs manual action. Submission is never treated as confirmed removal.
- API responses omit personal details and listing URLs. Users can delete job records.

## Requirements and local setup

Requires Node.js 22.16 or newer because it uses Node's built-in SQLite module. Playwright needs Chromium installed.

    cd service
    npm install
    npx playwright install chromium
    cp .env.example .env

Generate two different secrets using openssl rand -hex 32. Put one in REMOVEME_API_TOKEN and the other in REMOVEME_ENCRYPTION_KEY in .env. Never commit .env or expose the secrets.

Load local environment settings and start the service:

    set -a
    . ./.env
    set +a
    npm start

Default bind address is 127.0.0.1:8787. Keep it local. The current frontend is not integrated with this API, and the shared service token is only a development safeguard. Do not expose this prototype to the public internet.

## API

- GET /healthz — health check.
- GET /api/providers — public capability list.
- GET /api/jobs and GET /api/jobs/:id — job metadata only, token required.
- POST /api/jobs — validate consent and queue one request.
- POST /api/jobs/:id/run — explicit action to open and attempt the supported opt-out workflow.
- DELETE /api/jobs/:id — delete a non-running job.

Authenticated routes use Authorization: Bearer followed by the REMOVEME_API_TOKEN.

## Known limitations

The Spokeo adapter is experimental and has not been live-smoke-tested against every current form variant. Review the provider response and any confirmation email yourself; a submission does not prove removal. The service does not access the user's inbox or finish email confirmation.

Whitepages, BeenVerified and PeopleFinders are listed but disabled until their current flows and human verification requirements are tested. California DROP is an official workflow for eligible California residents and must be completed directly by the user.

Before public launch, add per-user authentication and authorization, rate limits, a production database and queue, secret management, monitoring, retention/deletion controls, abuse prevention, and a security review.