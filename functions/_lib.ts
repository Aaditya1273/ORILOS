// Shared helpers for the ORILOS account API (Cloudflare Pages Functions + D1).
import { LIVE_STATUSES, type Interval, type PlanId } from '../src/account/plans';
export { safeNext } from '../src/account/next';

export interface Env {
  DB: D1Database;
  /** ORILOS Connect relay (bridge/): one Durable Object per account. */
  BRIDGE: DurableObjectNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** "sandbox" while testing, "production" when live. */
  PADDLE_ENV: string;
  /** Public: lets Paddle.js open the checkout. */
  PADDLE_CLIENT_TOKEN: string;
  PADDLE_PRICE_PRO_MONTHLY: string;
  PADDLE_PRICE_PRO_YEARLY: string;
  PADDLE_PRICE_TEAM_MONTHLY: string;
  PADDLE_PRICE_TEAM_YEARLY: string;
  PADDLE_API_KEY?: string;
  PADDLE_WEBHOOK_SECRET?: string;
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
  refunded_at: number | null;
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

export const billingReady = (env: Env) => Boolean(env.PADDLE_API_KEY && env.PADDLE_WEBHOOK_SECRET && env.PADDLE_CLIENT_TOKEN);
/** Days after the first payment in which a subscription can be cancelled for a full refund (see the terms). */
export const REFUND_DAYS = 14;
export const paddleEnv = (env: Env) => (env.PADDLE_ENV === 'production' ? 'production' : 'sandbox');

export function priceFor(env: Env, plan: PlanId, interval: Interval): string {
  const ids: Record<string, string> = {
    'pro:monthly': env.PADDLE_PRICE_PRO_MONTHLY,
    'pro:yearly': env.PADDLE_PRICE_PRO_YEARLY,
    'team:monthly': env.PADDLE_PRICE_TEAM_MONTHLY,
    'team:yearly': env.PADDLE_PRICE_TEAM_YEARLY,
  };
  return ids[`${plan}:${interval}`] ?? '';
}

export function planForPrice(env: Env, priceId: string): { plan: PlanId; interval: Interval } | null {
  for (const plan of ['pro', 'team'] as const)
    for (const interval of ['monthly', 'yearly'] as const)
      if (priceId && priceFor(env, plan, interval) === priceId) return { plan, interval };
  return null;
}

/** Paddle signs "ts:body" with HMAC-SHA256 into `Paddle-Signature: ts=...;h1=...` (several h1 while a secret rotates).
 *  Constant-time check; old timestamps are refused so a captured request can't be replayed. */
export async function verifySignature(secret: string, body: string, header: string, now = Date.now() / 1000): Promise<boolean> {
  const parts = header.split(';').map((p) => p.split('='));
  const ts = parts.find(([k]) => k === 'ts')?.[1] ?? '';
  const sigs = parts.filter(([k, v]) => k === 'h1' && /^[0-9a-f]{64}$/i.test(v ?? '')).map(([, v]) => v);
  if (!/^\d+$/.test(ts) || Math.abs(now - Number(ts)) > 300 || !sigs.length) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const data = new TextEncoder().encode(`${ts}:${body}`);
  for (const sig of sigs)
    if (await crypto.subtle.verify('HMAC', key, new Uint8Array(sig.match(/../g)!.map((h) => parseInt(h, 16))), data)) return true;
  return false;
}

export async function paddle(env: Env, path: string, body?: unknown, method?: string): Promise<Response> {
  const host = paddleEnv(env) === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  return fetch(`${host}${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { authorization: `Bearer ${env.PADDLE_API_KEY}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/* ── ORILOS Connect: OAuth 2.1 for MCP clients such as claude.ai ── */

export const ACCESS_TTL = 3600;
export const REFRESH_TTL = 30 * 86400;
export const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version', 'access-control-allow-methods': 'GET, POST, OPTIONS' };

export interface OAuthClient {
  id: string;
  name: string;
  redirect_uris: string;
}

/** https anywhere, plain http only on this computer (native apps). No fragments. */
export function okRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash || uri.length > 500) return false;
    return u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname));
  } catch {
    return false;
  }
}

export async function oauthClient(env: Env, id: string): Promise<(OAuthClient & { uris: string[] }) | null> {
  const c = await env.DB.prepare('SELECT id, name, redirect_uris FROM oauth_clients WHERE id = ?').bind(id).first<OAuthClient>();
  return c ? { ...c, uris: JSON.parse(c.redirect_uris) as string[] } : null;
}

/** The authorize request, checked the same way at /oauth/authorize and when the person approves it. */
export async function checkAuthorize(env: Env, p: URLSearchParams): Promise<{ client: OAuthClient & { uris: string[] } } | { error: string }> {
  const client = await oauthClient(env, p.get('client_id') ?? '');
  if (!client) return { error: 'Unknown app. Remove the connector in Claude and add it again.' };
  if (!client.uris.includes(p.get('redirect_uri') ?? '')) return { error: 'This app asked to return to an address it did not register.' };
  if (p.get('response_type') !== 'code') return { error: 'Unsupported response_type.' };
  if (p.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(p.get('code_challenge') ?? ''))
    return { error: 'This app must use PKCE (S256).' };
  if ((p.get('state') ?? '').length > 500) return { error: 'state is too long.' };
  return { client };
}

/** The account behind an MCP request's bearer token, or null. */
export async function bearerUser(env: Env, request: Request): Promise<string | null> {
  const token = /^Bearer (ort_[A-Za-z0-9_-]{43})$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return null;
  const row = await env.DB.prepare('SELECT id, user_id, access_expires, used_at FROM oauth_tokens WHERE access_hash = ?')
    .bind(await sha256hex(token))
    .first<{ id: string; user_id: string; access_expires: number; used_at: number | null }>();
  if (!row || row.access_expires < now()) return null;
  if (!row.used_at || now() - row.used_at > 300) await env.DB.prepare('UPDATE oauth_tokens SET used_at = ? WHERE id = ?').bind(now(), row.id).run();
  return row.user_id;
}

export const bridgeFor = (env: Env, userId: string) => env.BRIDGE.get(env.BRIDGE.idFromName(userId));

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    const v = await request.json();
    return v && typeof v === 'object' ? (v as Partial<T>) : {};
  } catch {
    return {};
  }
}

export const toEpoch = (iso: unknown) => (typeof iso === 'string' && !Number.isNaN(Date.parse(iso)) ? Math.floor(Date.parse(iso) / 1000) : null);
