import { cookie, json, session, SESSION_COOKIE, type Fn } from '../../_lib';

export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (s) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(s.hash).run();
  return json({ ok: true }, 200, { 'set-cookie': cookie(SESSION_COOKIE, '', 0) });
};
