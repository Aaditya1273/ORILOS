import { fail, json, now, session, type Fn } from '../../_lib';

export const onRequestDelete: Fn = async ({ request, env, params }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  await env.DB.prepare('UPDATE licence_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL').bind(now(), String(params.id), s.user.id).run();
  return json({ ok: true });
};
