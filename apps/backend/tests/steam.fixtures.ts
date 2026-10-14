export const STEAM_TEST_KEY = 'not-a-real-steam-api-key';
export const STEAM_TEST_ID = '12345678901234567';
export const STEAM_DISCOVERY =
  '<XRDS><XRD><Service><Type>http://specs.openid.net/auth/2.0/signon</Type><URI>https://steamcommunity.com/openid/login</URI></Service></XRD></XRDS>';
export function steamCache() {
  const records = new Map<string, { value: string; expires: number }>();
  function peek(key: string) {
    const row = records.get(key);
    if (!row || row.expires < Date.now()) {
      records.delete(key);
      return null;
    }
    return row.value;
  }
  return {
    async get(key: string) {
      return peek(key);
    },
    async set(key: string, value: string, options?: { EX?: number; NX?: boolean }) {
      if (options?.NX && peek(key) !== null) return null;
      records.set(key, { value, expires: Date.now() + (options?.EX ?? 3600) * 1000 });
      return 'OK';
    },
    async getDel(key: string) {
      const value = peek(key);
      records.delete(key);
      return value;
    },
    async del(key: string) {
      return Number(records.delete(key));
    },
  };
}
export function steamAssertion(connectUrl: string, overrides: Record<string, string> = {}) {
  const returnTo = new URL(connectUrl).searchParams.get('openid.return_to') ?? '';
  const parameters: Record<string, string> = {
    steamState: new URL(returnTo).searchParams.get('steamState') ?? '',
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
    'openid.claimed_id': `https://steamcommunity.com/openid/id/${STEAM_TEST_ID}`,
    'openid.identity': `https://steamcommunity.com/openid/id/${STEAM_TEST_ID}`,
    'openid.return_to': returnTo,
    'openid.response_nonce': `${new Date().toISOString()}test-nonce`,
    'openid.assoc_handle': 'test-association',
    'openid.sig': 'test-signature',
    'openid.signed': 'op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    ...overrides,
  };
  const callback = new URL(returnTo);
  for (const [name, value] of Object.entries(parameters)) callback.searchParams.set(name, value);
  return { parameters, callbackUrl: callback.toString() };
}
