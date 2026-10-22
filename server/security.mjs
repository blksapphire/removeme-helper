import crypto from 'node:crypto';

export const CONSENT_VERSION = 'liveramp-agent-consent-2026-10-v1';

export function createAccessToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashAccessToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function tokenMatches(token, expectedHash) {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashAccessToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function encryptAuditValue(value) {
  const rawKey = process.env.DATA_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(rawKey)) {
    throw new Error('DATA_ENCRYPTION_KEY must be a 32-byte hexadecimal key.');
  }
  const key = Buffer.from(rawKey, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.');
}
