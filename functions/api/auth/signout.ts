import { cookie, hint, json, session, SESSION_COOKIE, type Fn } from '../../_lib';

export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (s) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(s.hash).run();
  const headers = new Headers({ 'set-cookie': cookie(SESSION_COOKIE, '', 0) });
  headers.append('set-cookie', hint(false));
  return json({ ok: true }, 200, headers);
};
