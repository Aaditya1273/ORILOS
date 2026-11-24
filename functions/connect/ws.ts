import { bridgeFor, fail, sha256hex, type Fn } from '../_lib';

// `uvx orilos-mcp connect` opens a websocket here, signed with the computer's licence key, and stays connected.
// Outside /api on purpose: the API middleware rewraps responses, which would break the 101 upgrade.
export const onRequestGet: Fn = async ({ request, env }) => {
  if (request.headers.get('upgrade') !== 'websocket') return fail(426, 'upgrade_required', 'This address is for the ORILOS app.');
  const key = /^Bearer (orl_[A-Za-z0-9_-]{43})$/.exec(request.headers.get('authorization') ?? '')?.[1];
  const deviceId = request.headers.get('x-orilos-device') ?? '';
  if (!key || !/^[A-Za-z0-9_-]{16,64}$/.test(deviceId)) return fail(401, 'invalid_key', 'Activate a licence key first: uvx orilos-mcp activate <key>');
  const row = await env.DB.prepare('SELECT id, user_id, device_id FROM licence_keys WHERE hash = ? AND revoked_at IS NULL')
    .bind(await sha256hex(key))
    .first<{ id: string; user_id: string; device_id: string | null }>();
  if (!row) return fail(401, 'invalid_key', 'That licence key is not valid or was revoked. Make a new one at orilos.pages.dev/account/keys.');
  if (row.device_id !== deviceId) return fail(409, 'key_in_use', 'This key belongs to another computer. Activate a key on this one first.');
  const forward = new Request(request);
  forward.headers.set('x-orilos-key', row.id); // tags the socket, so revoking this key can close it
  return bridgeFor(env, row.user_id).fetch(forward);
};
