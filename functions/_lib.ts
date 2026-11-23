// Shared helpers for the ORILOS account API (Cloudflare Pages Functions + D1).
import { LIVE_STATUSES, type Interval, type PlanId } from '../src/account/plans';
export { safeNext } from '../src/account/next';

export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET?: string;
  LS_API_KEY?: string;
  LS_WEBHOOK_SECRET?: string;
  LS_STORE_ID: string;
  LS_VARIANT_PRO_MONTHLY: string;
  LS_VARIANT_PRO_YEARLY: string;
  LS_VARIANT_TEAM_MONTHLY: string;
  LS_VARIANT_TEAM_YEARLY: string;
}
export type Fn = PagesFunction<Env>;

export interface User {
  id: string;
  google_sub: string;
  email: string;
  name: string;
  avatar: string;
  handle: string | null;
  timezone: string;
  created_at: number;
  plan: PlanId;
  sub_id: string | null;
  sub_status: string | null;
  sub_interval: Interval | null;
  sub_renews_at: number | null;
  sub_ends_at: number | null;
  customer_id: string | null;
}

export const SESSION_COOKIE = '__Host-orilos';
export const OAUTH_COOKIE = '__Host-orilos-oauth';
export const SESSION_DAYS = 30;
/** A readable "you are signed in" hint, so public pages only ask /api/me when it can succeed. Not a credential. */
export const hint = (on: boolean) => `orilos_in=${on ? 1 : ''}; Path=/; Secure; SameSite=Lax; Max-Age=${on ? SESSION_DAYS * 86400 : 0}`;

export const now = () => Math.floor(Date.now() / 1000);

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set('content-type', 'application/json; charset=utf-8');
  h.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: h });
}
export const fail = (status: number, error: string, message: string) => json({ error, message }, status);

export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

export async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
export const sha256hex = async (text: string) => [...(await sha256(text))].map((b) => b.toString(16).padStart(2, '0')).join('');

export function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export async function session(env: Env, request: Request): Promise<{ user: User; hash: string } | null> {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return null;
  const hash = await sha256hex(raw);
  const row = await env.DB.prepare(
    'SELECT u.*, s.seen_at AS s_seen, s.expires_at AS s_expires FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ?',
  ).bind(hash).first<User & { s_seen: number; s_expires: number }>();
  if (!row || row.s_expires < now()) return null;
  // Touch at most every 5 minutes, so reads stay reads.
  if (now() - row.s_seen > 300) await env.DB.prepare('UPDATE sessions SET seen_at = ? WHERE id_hash = ?').bind(now(), hash).run();
  const { s_seen: _seen, s_expires: _expires, ...user } = row;
  return { user, hash };
}

export async function newSession(env: Env, request: Request, userId: string): Promise<string> {
  const raw = randomToken();
  const t = now();
  const cf = (request as Request & { cf?: { country?: string } }).cf;
  await env.DB.prepare('INSERT INTO sessions (id_hash, user_id, created_at, seen_at, expires_at, agent, country) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(await sha256hex(raw), userId, t, t, t + SESSION_DAYS * 86400, (request.headers.get('user-agent') ?? '').slice(0, 300), cf?.country ?? '')
    .run();
  return cookie(SESSION_COOKIE, raw, SESSION_DAYS * 86400);
}

/** The user as the browser sees it: no provider ids. */
export function publicUser(u: User) {
  const paid = u.plan !== 'free' && LIVE_STATUSES.has(u.sub_status ?? '');
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    handle: u.handle,
    timezone: u.timezone,
    createdAt: u.created_at,
    plan: paid ? u.plan : 'free',
    subscription: u.sub_id
      ? { status: u.sub_status, interval: u.sub_interval, renewsAt: u.sub_renews_at, endsAt: u.sub_ends_at }
      : null,
  };
}

export const billingReady = (env: Env) => Boolean(env.LS_API_KEY && env.LS_STORE_ID && env.LS_WEBHOOK_SECRET);

export function variantFor(env: Env, plan: PlanId, interval: Interval): string {
  const ids: Record<string, string> = {
    'pro:monthly': env.LS_VARIANT_PRO_MONTHLY,
    'pro:yearly': env.LS_VARIANT_PRO_YEARLY,
    'team:monthly': env.LS_VARIANT_TEAM_MONTHLY,
    'team:yearly': env.LS_VARIANT_TEAM_YEARLY,
  };
  return ids[`${plan}:${interval}`] ?? '';
}

export function planForVariant(env: Env, variantId: string | number): { plan: PlanId; interval: Interval } | null {
  for (const plan of ['pro', 'team'] as const)
    for (const interval of ['monthly', 'yearly'] as const)
      if (variantFor(env, plan, interval) && variantFor(env, plan, interval) === String(variantId)) return { plan, interval };
  return null;
}

/** Lemon Squeezy signs each webhook body with HMAC-SHA256 (hex) in X-Signature. Constant-time check. */
export async function verifySignature(secret: string, body: string, signature: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sig = new Uint8Array(signature.match(/../g)!.map((h) => parseInt(h, 16)));
  return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(body));
}

export async function lemon(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.lemonsqueezy.com/v1${path}`, {
    ...init,
    headers: { accept: 'application/vnd.api+json', 'content-type': 'application/vnd.api+json', authorization: `Bearer ${env.LS_API_KEY}` },
  });
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    const v = await request.json();
    return v && typeof v === 'object' ? (v as Partial<T>) : {};
  } catch {
    return {};
  }
}

export const toEpoch = (iso: unknown) => (typeof iso === 'string' && !Number.isNaN(Date.parse(iso)) ? Math.floor(Date.parse(iso) / 1000) : null);
