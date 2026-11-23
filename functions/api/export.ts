import { fail, json, publicUser, session, type Fn } from '../_lib';

// Everything ORILOS stores about you, as one JSON file.
export const onRequestGet: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  const id = s.user.id;
  const [keys, sessions] = await Promise.all([
    env.DB.prepare('SELECT name, prefix, created_at, used_at, device, revoked_at FROM licence_keys WHERE user_id = ?').bind(id).all(),
    env.DB.prepare('SELECT created_at, seen_at, expires_at, agent, country FROM sessions WHERE user_id = ?').bind(id).all(),
  ]);
  return json({ exportedAt: new Date().toISOString(), user: publicUser(s.user), licenceKeys: keys.results, sessions: sessions.results }, 200, {
    'content-disposition': 'attachment; filename="orilos-account.json"',
  });
};
