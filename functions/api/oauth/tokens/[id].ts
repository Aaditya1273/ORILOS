import { fail, json, session, type Fn } from '../../../_lib';

// Disconnect an app: its tokens stop working at once.
export const onRequestDelete: Fn = async ({ request, env, params }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  await env.DB.prepare('DELETE FROM oauth_tokens WHERE id = ? AND user_id = ?').bind(String(params.id), s.user.id).run();
  return json({ ok: true });
};
