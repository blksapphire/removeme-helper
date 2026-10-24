import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLiveRampTokenCache } from './liveramp-auth.mjs';
import { createLiveRampRequest, getLiveRampRequest } from './liveramp.mjs';

function tokenResponse() {
  return new Response(JSON.stringify({ access_token: 'test-access-token', expires_in: 1800 }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('creates a request with a freshly obtained bearer token and organization header', async () => {
  clearLiveRampTokenCache();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/authn/')) return tokenResponse();
    return new Response(JSON.stringify({ uuid: 'req-123', status: 'ACCEPTED' }), { status: 201 });
  };
  const result = await createLiveRampRequest({
    accountId: 'account', secretKey: 'secret', orgId: 'org-1',
    payload: { email: 'person@example.com', request_type: 'OPT_OUT' }, fetchImpl
  });
  assert.equal(result.uuid, 'req-123');
  assert.equal(result.status, 'submitted');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-access-token');
  assert.equal(calls[1].options.headers['LR-Org-ID'], 'org-1');
  clearLiveRampTokenCache();
});

test('checks request status with a cached bearer token and UUID filter', async () => {
  clearLiveRampTokenCache();
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls += 1;
    if (String(url).includes('/authn/')) return tokenResponse();
    assert.equal(new URL(String(url)).searchParams.get('uuid'), 'req-123');
    assert.equal(options.headers.Authorization, 'Bearer test-access-token');
    return new Response(JSON.stringify({ uuid: 'req-123', status: 'PROCESSING' }), { status: 200 });
  };
  const result = await getLiveRampRequest({ accountId: 'account', secretKey: 'secret', orgId: 'org-1', uuid: 'req-123', fetchImpl });
  assert.equal(result.status, 'processing');
  assert.equal(calls, 2);
  clearLiveRampTokenCache();
});
