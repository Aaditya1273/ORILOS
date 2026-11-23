import { LIVE_STATUSES } from '../../src/account/plans';
import { billingReady, cookie, fail, hint, json, publicUser, readJson, session, SESSION_COOKIE, type Fn } from '../_lib';

export const onRequestGet: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  // Refresh the sign-in hint so public pages greet people who signed in before it existed.
  return json({ user: publicUser(s.user), billingReady: billingReady(env) }, 200, { 'set-cookie': hint(true) });
};

export const onRequestPatch: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  const body = await readJson<{ name: string; handle: string; timezone: string }>(request);
  const u = { ...s.user };
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length > 60) return fail(400, 'bad_name', 'Your name needs 1 to 60 characters.');
    u.name = name;
  }
  if (body.handle !== undefined) {
    const handle = String(body.handle).trim().toLowerCase();
    if (handle && !/^[a-z0-9_]{3,24}$/.test(handle)) return fail(400, 'bad_handle', 'Handles are 3 to 24 letters, numbers or underscores.');
    u.handle = handle || null;
  }
  if (body.timezone !== undefined) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: String(body.timezone) });
    } catch {
      return fail(400, 'bad_timezone', 'Pick a time zone from the list.');
    }
    u.timezone = String(body.timezone);
  }
  try {
    await env.DB.prepare('UPDATE users SET name = ?, handle = ?, timezone = ? WHERE id = ?').bind(u.name, u.handle, u.timezone, u.id).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) return fail(409, 'handle_taken', 'That handle is taken.');
    throw e;
  }
  return json({ user: publicUser(u) });
};

export const onRequestDelete: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  if (s.user.sub_id && LIVE_STATUSES.has(s.user.sub_status ?? '') && s.user.sub_status !== 'cancelled')
    return fail(409, 'cancel_first', 'Cancel your subscription in Billing first, then delete your account.');
  const id = s.user.id;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM licence_keys WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);
  const headers = new Headers({ 'set-cookie': cookie(SESSION_COOKIE, '', 0) });
  headers.append('set-cookie', hint(false));
  return json({ ok: true }, 200, headers);
};
