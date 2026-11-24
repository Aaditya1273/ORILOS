import { describe, expect, it } from 'vitest';
import { planForVariant, publicUser, safeNext, verifySignature, type Env, type User } from '../functions/_lib';

const env = { LS_VARIANT_PRO_MONTHLY: '11', LS_VARIANT_PRO_YEARLY: '12', LS_VARIANT_TEAM_MONTHLY: '21', LS_VARIANT_TEAM_YEARLY: '' } as Env;

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('account api', () => {
  it('only redirects to paths on this site', () => {
    expect(safeNext('/account/billing?plan=pro')).toBe('/account/billing?plan=pro');
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '', null, '/a b']) expect(safeNext(bad)).toBe('/account');
  });
  it('accepts only a correct webhook signature', async () => {
    const body = '{"meta":{}}';
    expect(await verifySignature('s3cret', body, await hmac('s3cret', body))).toBe(true);
    expect(await verifySignature('s3cret', body + ' ', await hmac('s3cret', body))).toBe(false);
    expect(await verifySignature('other', body, await hmac('s3cret', body))).toBe(false);
    expect(await verifySignature('s3cret', body, 'nothex')).toBe(false);
  });
  it('maps variants to plans, never an empty id', () => {
    expect(planForVariant(env, 12)).toEqual({ plan: 'pro', interval: 'yearly' });
    expect(planForVariant(env, '21')).toEqual({ plan: 'team', interval: 'monthly' });
    expect(planForVariant(env, '')).toBeNull();
    expect(planForVariant(env, 99)).toBeNull();
  });
  it('drops a paid plan once the subscription is over', () => {
    const u = { id: 'u', plan: 'pro', sub_id: 's', sub_status: 'active' } as User;
    expect(publicUser(u).plan).toBe('pro');
    expect(publicUser({ ...u, sub_status: 'cancelled' }).plan).toBe('pro');
    expect(publicUser({ ...u, sub_status: 'expired' }).plan).toBe('free');
    expect(publicUser({ ...u, sub_status: 'unpaid' }).plan).toBe('free');
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
