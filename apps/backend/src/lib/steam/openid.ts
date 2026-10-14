import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ForbiddenError } from '@/lib/errors.js';
import type { SteamCache } from './client.js';
import { requireSteamKey, steamText } from './http.js';

const OP = 'https://steamcommunity.com/openid/login';
const NS = 'http://specs.openid.net/auth/2.0';
const stateSchema = z.object({ userId: z.string(), returnTo: z.url(), createdAt: z.number() });
interface OpenIdCache extends SteamCache {
  getDel(key: string): Promise<string | null>;
  del(key: string): Promise<unknown>;
}
function reject(): never {
  throw new ForbiddenError('Não foi possível verificar sua conta Steam. Conecte novamente.');
}
function stateKey(state: string) {
  return `steam:openid:state:${state}`;
}
export class SteamOpenId {
  constructor(
    private readonly cache: OpenIdCache,
    private readonly appUrl: string,
    private readonly key?: string,
    private readonly timeoutMs = 5000,
  ) {}
  async connect(
    userId: string,
    oldState?: string,
    returnPath: '/account' | '/onboarding' = '/account',
  ) {
    requireSteamKey(this.key);
    if (oldState) await this.cache.del(stateKey(oldState));
    const state = randomBytes(32).toString('hex');
    const returnTo = new URL(returnPath, this.appUrl);
    returnTo.searchParams.set('steamState', state);
    await this.cache.set(
      stateKey(state),
      JSON.stringify({ userId, returnTo: returnTo.toString(), createdAt: Date.now() }),
      { EX: 600 },
    );
    const url = new URL(OP);
    const parameters = {
      'openid.ns': NS,
      'openid.mode': 'checkid_setup',
      'openid.claimed_id': `${NS}/identifier_select`,
      'openid.identity': `${NS}/identifier_select`,
      'openid.return_to': returnTo.toString(),
      'openid.realm': `${new URL(this.appUrl).origin}/`,
    };
    for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);
    return { state, url: url.toString() };
  }
  async disconnect(state?: string) {
    if (state) await this.cache.del(stateKey(state));
  }
  async verify(
    userId: string,
    sessionState: string | undefined,
    parameters: Record<string, string>,
    callbackUrl: string,
  ) {
    requireSteamKey(this.key);
    const state = parameters.steamState;
    if (!sessionState || sessionState !== state || !/^[a-f0-9]{64}$/.test(state)) reject();
    const stored = await this.cache.get(stateKey(state));
    if (!stored) reject();
    let decoded: unknown;
    try {
      decoded = JSON.parse(stored);
    } catch {
      reject();
    }
    const parsed = stateSchema.safeParse(decoded);
    if (
      !parsed.success ||
      parsed.data.userId !== userId ||
      Date.now() - parsed.data.createdAt > 600000
    )
      reject();
    const expected = new URL(parsed.data.returnTo);
    const callback = new URL(callbackUrl);
    if (
      callback.origin !== expected.origin ||
      callback.pathname !== expected.pathname ||
      callback.hash
    )
      reject();
    for (const [name, value] of Object.entries(parameters))
      if (
        callback.searchParams.getAll(name).length !== 1 ||
        callback.searchParams.get(name) !== value
      )
        reject();
    if (
      parameters['openid.return_to'] !== expected.toString() ||
      callback.searchParams.get('steamState') !== state
    )
      reject();
    if (
      parameters['openid.ns'] !== NS ||
      parameters['openid.mode'] !== 'id_res' ||
      parameters['openid.op_endpoint'] !== OP
    )
      reject();
    const claimed = parameters['openid.claimed_id'];
    const steamId = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(
      claimed ?? '',
    )?.[1];
    if (!steamId || parameters['openid.identity'] !== claimed) reject();
    const signed = new Set((parameters['openid.signed'] ?? '').split(','));
    for (const field of [
      'op_endpoint',
      'claimed_id',
      'identity',
      'return_to',
      'response_nonce',
      'assoc_handle',
    ])
      if (!signed.has(field) || !parameters[`openid.${field}`]) reject();
    if (!parameters['openid.sig']) reject();
    const nonce = parameters['openid.response_nonce'];
    const time = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)[\x21-\x7e]+$/.exec(
      nonce ?? '',
    )?.[1];
    const age = time ? Date.now() - new Date(time).getTime() : NaN;
    if (!Number.isFinite(age) || age < -60000 || age > 600000) reject();
    // Steam is the only allowed OP/identifier namespace. Discover its pinned
    // claimed identifier over HTTPS; do not fetch arbitrary callback URLs.
    const discovery = await steamText(
      `https://steamcommunity.com/openid/id/${steamId}`,
      {},
      this.timeoutMs,
    );
    if (
      !discovery.includes(`<Type>${NS}/signon</Type>`) ||
      !/<URI>\s*https:\/\/steamcommunity\.com\/openid\/login\s*<\/URI>/.test(discovery)
    )
      reject();
    const body = new URLSearchParams();
    for (const [name, value] of Object.entries(parameters))
      if (name.startsWith('openid.')) body.set(name, value);
    body.set('openid.mode', 'check_authentication');
    const answer = await steamText(
      OP,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
      this.timeoutMs,
    );
    const validity = answer.split(/\r?\n/).filter((line) => line.startsWith('is_valid:'));
    if (validity.length !== 1 || validity[0] !== 'is_valid:true') reject();
    const nonceKey = `steam:openid:nonce:${createHash('sha256').update(nonce).digest('hex')}`;
    if (!(await this.cache.set(nonceKey, 'used', { EX: 600, NX: true }))) reject();
    if ((await this.cache.getDel(stateKey(state))) !== stored) reject();
    return steamId;
  }
}
