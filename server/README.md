# RemoveMe Helper service API

This server adds a first-party request workflow and one provider connector. It is not yet a universal removal engine.

## Endpoints

- `GET /api/health` — health and persistence status.
- `GET /api/service-status` — reports whether the LiveRamp connector is configured, without exposing credentials.
- `POST /api/liveramp/requests` — validates explicit consent and a typed signature, then submits a request to the official LiveRamp Privacy API.
- `GET /api/removal-cases/:id` — checks current provider status when possible. Requires `Authorization: Bearer <accessToken>`.
- `DELETE /api/removal-cases/:id` — deletes the local case and encrypted authorization receipt. This cannot cancel a request already submitted upstream.

## Storage and privacy

SQLite stores a random case ID, a hash of the one-time access key, request type/status, provider reference, timestamps, status events, and an AES-256-GCM encrypted typed-signature receipt. It does not store the user's full name or email. Those are sent directly to LiveRamp only after authorization.

The raw access token is returned only when the case is created and held in browser `sessionStorage`; users can copy the case ID and access key as a recovery copy. API responses are not cached.

## Setup

Use Node.js 22 or newer.

```sh
cp .env.example .env
openssl rand -hex 32
# Paste the generated value into DATA_ENCRYPTION_KEY
npm install
npm test
npm run build
npm run dev:api
```

In another terminal, run `npm run dev`. Vite proxies `/api` to port 8787.

For a containerized single-origin deployment:

```sh
cp .env.example .env
# Set DATA_ENCRYPTION_KEY and any approved provider credentials.
docker compose up --build -d
docker compose logs -f
```

## Enabling LiveRamp

Set `LIVERAMP_API_TOKEN` and `LIVERAMP_ORG_ID` only with legitimate credentials. Do not set `LIVERAMP_AGENT_AUTHORIZED=true` until the organization has the required API permissions and the current authorized-agent obligations and consent wording have been reviewed. The application refuses to submit while any guard is missing. Without these values, the interface remains visible but submission is disabled.

Provider statuses map to `submitted`, `processing`, `completed`, and `failed`. These are provider-reported states. “Submitted” does not mean the personal information has already been removed from every website.

## Adding providers

Add adapters under `server/providers/`. Each must have a verified official request route, jurisdiction checks, required-field validation, clear submission semantics, safe retry/idempotency handling, and status refresh. Never bypass CAPTCHA, identity verification, or a provider's access controls.
