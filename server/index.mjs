import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Database from 'better-sqlite3';
import { createAccessToken, hashAccessToken, tokenMatches, encryptAuditValue, CONSENT_VERSION } from './security.mjs';
import { validateLiveRampInput, createLiveRampRequest, getLiveRampRequest, LiveRampApiError } from './providers/liveramp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8787);
const dataDir = path.resolve(process.env.DATA_DIR || path.join(rootDir, 'data'));
const isProduction = process.env.NODE_ENV === 'production';

function encryptionKeyIsValid() {
  return /^[a-f0-9]{64}$/i.test(process.env.DATA_ENCRYPTION_KEY || '');
}

if (!encryptionKeyIsValid()) {
  console.error('Missing or invalid DATA_ENCRYPTION_KEY. Generate a 32-byte key with: openssl rand -hex 32');
  process.exit(1);
}

fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'removeme.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.exec(
  'CREATE TABLE IF NOT EXISTS removal_cases (' +
  'id TEXT PRIMARY KEY, access_token_hash TEXT NOT NULL, provider TEXT NOT NULL, ' +
  'request_type TEXT NOT NULL, status TEXT NOT NULL, provider_uuid TEXT, ' +
  'consent_version TEXT NOT NULL, consented_at TEXT NOT NULL, signature_ciphertext TEXT NOT NULL, ' +
  'created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_checked_at TEXT, provider_http_status INTEGER);' +
  'CREATE TABLE IF NOT EXISTS case_events (' +
  'id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL REFERENCES removal_cases(id) ON DELETE CASCADE, ' +
  'event_code TEXT NOT NULL, label TEXT NOT NULL, created_at TEXT NOT NULL);' +
  'CREATE INDEX IF NOT EXISTS case_events_case_id_idx ON case_events(case_id, id);'
);

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', req.path.startsWith('/api/') ? 'no-store' : 'no-cache');

  const origin = req.get('origin');
  const configuredOrigin = (process.env.ALLOWED_ORIGIN || '').trim().replace(/\/$/, '');
  let originAllowed = !origin;
  if (origin && configuredOrigin && origin === configuredOrigin) originAllowed = true;
  if (origin && !configuredOrigin) {
    try {
      originAllowed = new URL(origin).origin === req.protocol + '://' + req.get('host');
    } catch {
      originAllowed = false;
    }
  }
  if (origin && !originAllowed) return res.status(403).json({ message: 'Origin not allowed. Configure the exact public origin on the server if this is an approved deployment.' });
  if (origin && originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '16kb', strict: true }));

const createAttempts = new Map();
function rateLimitCreate(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  let previous = createAttempts.get(key);
  if (!previous || now - previous.start > 60_000) {
    previous = { start: now, count: 0 };
    createAttempts.set(key, previous);
  }
  previous.count += 1;
  if (previous.count > 5) return res.status(429).json({ message: 'Too many requests from this connection. Try again in a minute.' });
  if (createAttempts.size > 5000) {
    for (const [ip, entry] of createAttempts) {
      if (now - entry.start > 120_000) createAttempts.delete(ip);
    }
  }
  next();
}

function addEvent(caseId, code, label, at = new Date().toISOString()) {
  db.prepare('INSERT INTO case_events(case_id, event_code, label, created_at) VALUES (?, ?, ?, ?)').run(caseId, code, label, at);
}

function parseBearer(req) {
  const value = req.get('authorization') || '';
  const match = value.match(/^Bearer ([A-Za-z0-9_-]{32,})$/);
  return match ? match[1] : null;
}

function getAuthorizedCase(req, res) {
  const record = db.prepare('SELECT * FROM removal_cases WHERE id = ?').get(req.params.id);
  const token = parseBearer(req);
  if (!record || !tokenMatches(token, record.access_token_hash)) {
    res.status(404).json({ message: 'Case not found or access key is invalid.' });
    return null;
  }
  return record;
}

function publicCase(record) {
  return {
    caseId: record.id,
    provider: record.provider,
    requestType: record.request_type,
    status: record.status,
    providerRequestId: record.provider_uuid || null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    lastCheckedAt: record.last_checked_at || null
  };
}

function integrationEnabled() {
  return Boolean(
    process.env.LIVERAMP_API_TOKEN &&
    process.env.LIVERAMP_ORG_ID &&
    process.env.LIVERAMP_AGENT_AUTHORIZED === 'true' &&
    encryptionKeyIsValid()
  );
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'removeme-helper', persistence: 'sqlite' });
});

app.get('/api/service-status', (_req, res) => {
  const enabled = integrationEnabled();
  res.json({
    service: 'RemoveMe Helper',
    ready: true,
    integrations: {
      liveramp: {
        enabled,
        mode: 'official-api',
        message: enabled
          ? 'Server connector configured. Every request requires an explicit signed authorization.'
          : 'Server setup required: LiveRamp API credentials, encryption key, and confirmed authorized-agent approval.'
      }
    }
  });
});

app.post('/api/liveramp/requests', rateLimitCreate, async (req, res) => {
  if (!integrationEnabled()) {
    return res.status(503).json({ message: 'LiveRamp submission is disabled. The server owner must configure approved API access and the authorization workflow first.' });
  }

  let validated;
  try {
    validated = validateLiveRampInput(req.body || {});
    if (req.body.consent !== true) throw new Error('You must explicitly authorize this request before it can be sent.');
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Check the request details and try again.' });
  }

  const caseId = crypto.randomUUID();
  const accessToken = createAccessToken();
  const consentedAt = new Date().toISOString();
  const requestType = req.body.requestType;

  try {
    db.prepare(
      'INSERT INTO removal_cases ' +
      '(id, access_token_hash, provider, request_type, status, provider_uuid, consent_version, consented_at, signature_ciphertext, created_at, updated_at) ' +
      "VALUES (?, ?, 'liveramp', ?, 'submitting', NULL, ?, ?, ?, ?, ?)"
    ).run(
      caseId,
      hashAccessToken(accessToken),
      requestType,
      CONSENT_VERSION,
      consentedAt,
      encryptAuditValue(validated.signature),
      consentedAt,
      consentedAt
    );
    addEvent(caseId, 'authorization_recorded', 'Signed authorization recorded');
  } catch {
    // Database errors are kept out of the client response so no internal details leak.
    return res.status(500).json({ message: 'The service could not save a secure request record. No provider request was sent.' });
  }

  try {
    const providerResult = await createLiveRampRequest({
      token: process.env.LIVERAMP_API_TOKEN,
      orgId: process.env.LIVERAMP_ORG_ID,
      payload: validated.payload
    });
    const status = providerResult.status || 'submitted';
    const updatedAt = new Date().toISOString();
    db.prepare('UPDATE removal_cases SET status = ?, provider_uuid = ?, updated_at = ?, provider_http_status = ? WHERE id = ?')
      .run(status, providerResult.uuid, updatedAt, providerResult.duplicate ? 200 : 201, caseId);
    addEvent(
      caseId,
      providerResult.duplicate ? 'provider_duplicate_acknowledged' : 'provider_acknowledged',
      providerResult.duplicate ? 'LiveRamp acknowledged a matching existing request' : 'LiveRamp acknowledged the submission',
      updatedAt
    );
    const record = db.prepare('SELECT * FROM removal_cases WHERE id = ?').get(caseId);
    return res.status(201).json({
      ...publicCase(record),
      accessToken,
      message: providerResult.duplicate
        ? 'LiveRamp acknowledged a matching existing request. This does not confirm the listing has been removed.'
        : 'LiveRamp acknowledged the request. This does not mean the data has already been removed.',
      events: db.prepare('SELECT id, event_code AS code, label, created_at AS createdAt FROM case_events WHERE case_id = ? ORDER BY id').all(caseId)
    });
  } catch (error) {
    const updatedAt = new Date().toISOString();
    const status = error instanceof LiveRampApiError ? 'failed' : 'submission_unknown';
    const httpStatus = error instanceof LiveRampApiError ? error.statusCode : null;
    db.prepare('UPDATE removal_cases SET status = ?, updated_at = ?, provider_http_status = ? WHERE id = ?')
      .run(status, updatedAt, httpStatus, caseId);
    addEvent(
      caseId,
      status,
      status === 'failed'
        ? 'LiveRamp rejected the submission; review request details and provider access'
        : 'Connection ended before the service could confirm provider receipt',
      updatedAt
    );
    const record = db.prepare('SELECT * FROM removal_cases WHERE id = ?').get(caseId);
    return res.status(201).json({
      ...publicCase(record),
      accessToken,
      message: status === 'failed'
        ? 'LiveRamp did not accept the request. Your authorization receipt was saved, but no successful submission is confirmed.'
        : 'The connection ended before the service could confirm receipt. Check this case before attempting another submission.',
      events: db.prepare('SELECT id, event_code AS code, label, created_at AS createdAt FROM case_events WHERE case_id = ? ORDER BY id').all(caseId)
    });
  }
});

app.get('/api/removal-cases/:id', async (req, res) => {
  const record = getAuthorizedCase(req, res);
  if (!record) return;

  let current = record;
  if (record.provider === 'liveramp' && record.provider_uuid && integrationEnabled()) {
    try {
      const remote = await getLiveRampRequest({
        token: process.env.LIVERAMP_API_TOKEN,
        orgId: process.env.LIVERAMP_ORG_ID,
        uuid: record.provider_uuid
      });
      const now = new Date().toISOString();
      const nextStatus = remote.status || record.status;
      if (nextStatus !== record.status) {
        addEvent(record.id, nextStatus, 'LiveRamp status changed to ' + nextStatus, now);
      }
      db.prepare('UPDATE removal_cases SET status = ?, updated_at = ?, last_checked_at = ? WHERE id = ?')
        .run(nextStatus, now, now, record.id);
      current = db.prepare('SELECT * FROM removal_cases WHERE id = ?').get(record.id);
    } catch {
      // Return last known status. Never log provider response bodies that could contain personal data.
    }
  }

  const events = db.prepare('SELECT id, event_code AS code, label, created_at AS createdAt FROM case_events WHERE case_id = ? ORDER BY id').all(record.id);
  return res.json({
    ...publicCase(current),
    message: current.status === 'completed'
      ? 'LiveRamp reports this request as completed. Recheck relevant listings separately; this dashboard does not independently scan the web.'
      : current.status === 'failed'
        ? 'LiveRamp reports a failure or did not accept the request.'
        : current.status === 'submission_unknown'
          ? 'The service could not confirm whether LiveRamp received the request. Check the provider before retrying.'
          : 'This is the latest status available from LiveRamp. An accepted request is not a guarantee of immediate removal.',
    events
  });
});

app.delete('/api/removal-cases/:id', (req, res) => {
  const record = getAuthorizedCase(req, res);
  if (!record) return;
  db.prepare('DELETE FROM removal_cases WHERE id = ?').run(record.id);
  return res.json({ ok: true, message: 'Local case history and encrypted authorization receipt deleted. This does not cancel a request already sent to LiveRamp.' });
});

if (isProduction) {
  const distDir = path.join(rootDir, 'dist');
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'API route not found.' });
  return res.status(404).send('Not found');
});

const server = app.listen(port, () => {
  console.log('RemoveMe Helper service listening on port ' + port);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
