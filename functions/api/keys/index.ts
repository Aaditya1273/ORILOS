import { fail, json, now, randomToken, readJson, session, sha256hex, type Fn } from '../../_lib';

const MAX_KEYS = 20;

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
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM licence_keys WHERE user_id = ? AND revoked_at IS NULL').bind(s.user.id).first<number>('n');
  if ((count ?? 0) >= MAX_KEYS) return fail(409, 'too_many_keys', `You can have ${MAX_KEYS} keys. Revoke one you no longer use.`);
  const key = `orl_${randomToken(32)}`;
  const row = { id: `k_${randomToken(9)}`, name, prefix: key.slice(0, 12), createdAt: now(), usedAt: null, device: '' };
  await env.DB.prepare('INSERT INTO licence_keys (id, user_id, name, prefix, hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(row.id, s.user.id, row.name, row.prefix, await sha256hex(key), row.createdAt)
    .run();
  return json({ key, ...row }, 201);
};
