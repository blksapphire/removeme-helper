import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLiveRampTokenCache, getLiveRampAccessToken } from './liveramp-auth.mjs';

test('requests a LiveRamp access token using service-account credentials', async () => {
  clearLiveRampTokenCache();
  let request;
  const token = await getLiveRampAccessToken({
    accountId: 'account-id', secretKey: 'secret-key', now: 1000,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ access_token: 'access-1', expires_in: 1800 }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  assert.equal(token, 'access-1');
  assert.equal(request.url, 'https://serviceaccounts.liveramp.com/authn/v1/oauth2/token');
  assert.match(String(request.options.body), /grant_type=password/);
  assert.match(String(request.options.body), /username=account-id/);
});

test('reuses a cached token while valid and refreshes it before expiry', async () => {
  clearLiveRampTokenCache();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({ access_token: 'access-' + calls, expires_in: 1800 }), { status: 200 });
  };
  const credentials = { accountId: 'account-id', secretKey: 'secret-key', fetchImpl };
  assert.equal(await getLiveRampAccessToken({ ...credentials, now: 1000 }), 'access-1');
  assert.equal(await getLiveRampAccessToken({ ...credentials, now: 2000 }), 'access-1');
  assert.equal(calls, 1);
  assert.equal(await getLiveRampAccessToken({ ...credentials, now: 1_800_000 }), 'access-2');
  assert.equal(calls, 2);
  clearLiveRampTokenCache();
});

test('fails closed when the provider does not issue a usable token', async () => {
  clearLiveRampTokenCache();
  await assert.rejects(getLiveRampAccessToken({
    accountId: 'account-id', secretKey: 'wrong-secret',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }), /authentication failed/i);
});
