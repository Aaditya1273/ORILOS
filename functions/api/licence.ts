import { LIVE_STATUSES } from '../../src/account/plans';
import { fail, json, now, readJson, sha256hex, type Fn } from '../_lib';

// The ORILOS app checks its licence key here: POST {"key": "orl_...", "device": "Aadi's laptop", "device_id": "<random id>"}.
// A key belongs to the first computer that checks it; another computer gets 409 until the key is revoked.
// ponytail: plain JSON over TLS, cached by the app for a few days; sign responses if offline forgery ever matters.
export const onRequestPost: Fn = async ({ request, env }) => {
  const body = await readJson<{ key: string; device: string; device_id: string }>(request);
  const key = String(body.key ?? '');
  const deviceId = String(body.device_id ?? '');
  if (!/^orl_[A-Za-z0-9_-]{43}$/.test(key)) return fail(401, 'invalid_key', 'That licence key is not valid.');
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(deviceId))
    return fail(401, 'update_orilos', 'This version of ORILOS is too old for licence keys. Update it: uvx orilos-mcp@latest install');
  const row = await env.DB.prepare(
    `SELECT k.id, k.device_id, k.device, u.email, u.name, u.plan, u.sub_status FROM licence_keys k JOIN users u ON u.id = k.user_id
     WHERE k.hash = ? AND k.revoked_at IS NULL`,
  ).bind(await sha256hex(key)).first<{ id: string; device_id: string | null; device: string | null; email: string; name: string; plan: string; sub_status: string | null }>();
  if (!row) return fail(401, 'invalid_key', 'That licence key is not valid or was revoked.');
  if (row.device_id && row.device_id !== deviceId)
    return fail(409, 'key_in_use', `This key is already used on another computer (${row.device || 'unnamed'}). Make a new key for this computer at orilos.pages.dev/account/keys.`);
  await env.DB.prepare('UPDATE licence_keys SET used_at = ?, device = ?, device_id = ? WHERE id = ?')
    .bind(now(), String(body.device ?? '').slice(0, 60), deviceId, row.id).run();
  const plan = row.plan !== 'free' && LIVE_STATUSES.has(row.sub_status ?? '') ? row.plan : 'free';
  return json({ valid: true, plan, email: row.email, name: row.name, checkedAt: now() });
};
