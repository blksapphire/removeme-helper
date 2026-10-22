const US_STATES_WITH_COMPREHENSIVE_PRIVACY_LAWS = new Set([
  'AL','CA','CO','CT','DE','IN','IA','KY','LA','MD','MN','MT','NE','NH','NJ','OK','OR','RI','TN','TX','UT','VA'
]);

export function normaliseFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) throw new Error('Enter your first and last name as shown on your records.');
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export function validateLiveRampInput(input) {
  const name = normaliseFullName(input.fullName);
  const email = String(input.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (input.country !== 'United States') throw new Error('This LiveRamp integration currently supports US-resident requests only.');
  if (!['OPT_OUT','DELETION'].includes(input.requestType)) throw new Error('Choose a supported request type.');
  const state = String(input.state || '').trim().toUpperCase();
  if (input.requestType === 'DELETION' && !US_STATES_WITH_COMPREHENSIVE_PRIVACY_LAWS.has(state)) {
    throw new Error('LiveRamp deletion requests are limited to eligible US states. Choose Opt out if that better matches your intent.');
  }
  const signature = String(input.signature || '').trim();
  const normalisedName = String(input.fullName || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const normalisedSignature = signature.replace(/\s+/g, ' ').toLocaleLowerCase();
  if (!signature || normalisedSignature !== normalisedName) throw new Error('Your typed signature must match your full legal name.');
  return {
    payload: { email, ...name, request_type: input.requestType, ...(state ? { state } : {}) },
    signature
  };
}

export function mapLiveRampStatus(status) {
  const value = String(status || '').toUpperCase();
  const mapped = {
    ACCEPTED: 'submitted',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  };
  return mapped[value] || 'submitted';
}

export function extractLiveRampRequest(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const candidate = payload.request || payload.data?.request || payload.data || payload;
  return {
    uuid: candidate.uuid || candidate.request_uuid || candidate.id || payload.uuid || payload.request_uuid || null,
    status: candidate.status || payload.status || null,
    requestType: candidate.request_type || candidate.requestType || payload.request_type || null
  };
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

export class LiveRampApiError extends Error {
  constructor(statusCode, code = 'provider_rejected_request') {
    super('LiveRamp did not accept the request.');
    this.name = 'LiveRampApiError';
    this.statusCode = statusCode || null;
    this.code = code;
  }
}

export async function createLiveRampRequest({ token, orgId, payload, fetchImpl = fetch }) {
  const response = await fetchImpl('https://privacy-api.liveramp.com/v1/requests', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'LR-Org-ID': orgId, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  const body = await parseResponse(response);
  if (!response.ok) throw new LiveRampApiError(response.status);
  const extracted = extractLiveRampRequest(body);
  return { ...extracted, duplicate: response.status === 200, status: mapLiveRampStatus(extracted.status || 'ACCEPTED') };
}

export async function getLiveRampRequest({ token, orgId, uuid, fetchImpl = fetch }) {
  const url = new URL('https://privacy-api.liveramp.com/v1/requests');
  url.searchParams.set('uuid', uuid);
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token, 'LR-Org-ID': orgId, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  const body = await parseResponse(response);
  if (!response.ok) throw new LiveRampApiError(response.status, 'provider_status_unavailable');
  const request = extractLiveRampRequest(body);
  return { ...request, status: mapLiveRampStatus(request.status || 'ACCEPTED') };
}
