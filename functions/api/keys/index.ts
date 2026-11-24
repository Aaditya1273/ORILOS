import { KEY_LIMITS } from '../../../src/account/plans';
import { fail, json, now, publicUser, randomToken, readJson, session, sha256hex, type Fn } from '../../_lib';

export const onRequestGet: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  const { results } = await env.DB.prepare(
    'SELECT id, name, prefix, created_at AS createdAt, used_at AS usedAt, device FROM licence_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC',
  ).bind(s.user.id).all();
  return json({ keys: results });
};

// A new licence key. The full key is returned once; only its hash is stored.
export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  const name = String((await readJson<{ name: string }>(request)).name ?? '').trim().slice(0, 40) || 'My computer';
  const max = KEY_LIMITS[publicUser(s.user).plan];
  const key = `orl_${randomToken(32)}`;
  const row = { id: `k_${randomToken(9)}`, name, prefix: key.slice(0, 12), createdAt: now(), usedAt: null, device: '' };
  // The limit is checked inside the insert, so two clicks at once cannot both get past it.
  const added = await env.DB.prepare(
    `INSERT INTO licence_keys (id, user_id, name, prefix, hash, created_at) SELECT ?, ?, ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM licence_keys WHERE user_id = ? AND revoked_at IS NULL) < ?`,
  ).bind(row.id, s.user.id, row.name, row.prefix, await sha256hex(key), row.createdAt, s.user.id, max).run();
  if (!added.meta.changes)
    return fail(409, 'too_many_keys', `Your plan includes ${max} ${max === 1 ? 'computer' : 'computers'}. Revoke a key you no longer use, or upgrade for more.`);
  return json({ key, ...row }, 201);
};
