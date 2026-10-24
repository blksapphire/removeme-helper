let cachedToken = null;
let expiresAt = 0;

export async function getLiveRampAccessToken({ accountId, secretKey, fetchImpl = fetch, now = Date.now() }) {
  if (!accountId || !secretKey) throw new Error('LiveRamp service-account credentials are not configured.');
  if (cachedToken && now < expiresAt - 60_000) return cachedToken;

  const response = await fetchImpl('https://serviceaccounts.liveramp.com/authn/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: accountId,
      password: secretKey,
      scope: 'openid',
      client_id: 'liveramp-api',
      response_type: 'token'
    }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.access_token !== 'string' || !body.access_token || !Number.isFinite(Number(body.expires_in))) {
    cachedToken = null;
    expiresAt = 0;
    throw new Error('LiveRamp authentication failed. Check service-account credentials and API access.');
  }
  cachedToken = body.access_token;
  expiresAt = now + Math.max(60, Number(body.expires_in)) * 1000;
  return cachedToken;
}

export function clearLiveRampTokenCache() {
  cachedToken = null;
  expiresAt = 0;
}
