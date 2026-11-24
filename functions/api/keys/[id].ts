import { bridgeFor, fail, json, now, session, type Fn } from '../../_lib';

export const onRequestDelete: Fn = async ({ request, env, params }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  const id = String(params.id);
  await env.DB.prepare('UPDATE licence_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL').bind(now(), id, s.user.id).run();
  await bridgeFor(env, s.user.id).fetch(`https://bridge/close?key=${encodeURIComponent(id)}`, { method: 'POST' }).catch((e) => console.error('bridge close', e));
  return json({ ok: true });
};
