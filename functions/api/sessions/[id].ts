import { fail, json, session, type Fn } from '../../_lib';

export const onRequestDelete: Fn = async ({ request, env, params }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ? AND user_id = ?').bind(String(params.id), s.user.id).run();
  return json({ ok: true });
};
