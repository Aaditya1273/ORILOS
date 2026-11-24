import { describe, expect, it } from 'vitest';
import { planForPrice, publicUser, safeNext, verifySignature, type Env, type User } from '../functions/_lib';

const env = { PADDLE_PRICE_PRO_MONTHLY: 'pri_pm', PADDLE_PRICE_PRO_YEARLY: 'pri_py', PADDLE_PRICE_TEAM_MONTHLY: 'pri_tm', PADDLE_PRICE_TEAM_YEARLY: '' } as Env;

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('account api', () => {
  it('only redirects to paths on this site', () => {
    expect(safeNext('/account/billing?plan=pro')).toBe('/account/billing?plan=pro');
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '', null, '/a b']) expect(safeNext(bad)).toBe('/account');
  });
  it('accepts only a correct, fresh Paddle signature', async () => {
    const body = '{"event_type":"subscription.created"}';
    const now = 1_800_000_000;
    const header = async (secret: string, ts = now) => `ts=${ts};h1=${await hmac(secret, `${ts}:${body}`)}`;
    expect(await verifySignature('s3cret', body, await header('s3cret'), now)).toBe(true);
    expect(await verifySignature('s3cret', body + ' ', await header('s3cret'), now)).toBe(false);
    expect(await verifySignature('other', body, await header('s3cret'), now)).toBe(false);
    expect(await verifySignature('s3cret', body, await header('s3cret', now - 600), now)).toBe(false); // replayed later
    expect(await verifySignature('s3cret', body, `ts=${now};h1=${'0'.repeat(64)};h1=${(await header('s3cret')).split('h1=')[1]}`, now)).toBe(true); // secret rotation
    expect(await verifySignature('s3cret', body, 'nothing', now)).toBe(false);
  });
  it('maps prices to plans, never an empty id', () => {
    expect(planForPrice(env, 'pri_py')).toEqual({ plan: 'pro', interval: 'yearly' });
    expect(planForPrice(env, 'pri_tm')).toEqual({ plan: 'team', interval: 'monthly' });
    expect(planForPrice(env, '')).toBeNull();
    expect(planForPrice(env, 'pri_other')).toBeNull();
  });
  it('drops a paid plan once the subscription is over', () => {
    const u = { id: 'u', plan: 'pro', sub_id: 's', sub_status: 'active' } as User;
    expect(publicUser(u).plan).toBe('pro');
    expect(publicUser({ ...u, sub_status: 'past_due' }).plan).toBe('pro');
    expect(publicUser({ ...u, sub_status: 'canceled' }).plan).toBe('free');
    expect(publicUser({ ...u, sub_status: 'paused' }).plan).toBe('free');
    expect('google_sub' in publicUser(u)).toBe(false);
  });
});

describe('plans', () => {
  it('Free styles are 12 real styles and key limits grow with the plan', async () => {
    const { STYLES } = await import('../src/docs/data');
    const { FREE_STYLES, KEY_LIMITS } = await import('../src/account/plans');
    const names = new Set(STYLES.map((s) => s.name));
    expect(FREE_STYLES.size).toBe(12);
    expect([...FREE_STYLES].every((s) => names.has(s))).toBe(true);
    expect(KEY_LIMITS.free < KEY_LIMITS.pro && KEY_LIMITS.pro < KEY_LIMITS.team).toBe(true);
  });
});
