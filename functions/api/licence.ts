import { LIVE_STATUSES } from '../../src/account/plans';
import { fail, json, now, readJson, sha256hex, type Fn } from '../_lib';

// The ORILOS app checks its licence key here: POST {"key": "orl_...", "device": "Aadi's laptop"}.
// ponytail: plain JSON over TLS, cached by the app for a few days; sign responses if offline forgery ever matters.
export const onRequestPost: Fn = async ({ request, env }) => {
  const body = await readJson<{ key: string; device: string }>(request);
  const key = String(body.key ?? '');
  if (!/^orl_[A-Za-z0-9_-]{43}$/.test(key)) return fail(401, 'invalid_key', 'That licence key is not valid.');
  const row = await env.DB.prepare(
    `SELECT k.id, u.email, u.name, u.plan, u.sub_status FROM licence_keys k JOIN users u ON u.id = k.user_id
     WHERE k.hash = ? AND k.revoked_at IS NULL`,
  ).bind(await sha256hex(key)).first<{ id: string; email: string; name: string; plan: string; sub_status: string | null }>();
  if (!row) return fail(401, 'invalid_key', 'That licence key is not valid or was revoked.');
  await env.DB.prepare('UPDATE licence_keys SET used_at = ?, device = ? WHERE id = ?').bind(now(), String(body.device ?? '').slice(0, 60), row.id).run();
  const plan = row.plan !== 'free' && LIVE_STATUSES.has(row.sub_status ?? '') ? row.plan : 'free';
  return json({ valid: true, plan, email: row.email, name: row.name, checkedAt: now() });
};
