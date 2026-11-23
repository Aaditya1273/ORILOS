import { fail, json, session, type Fn } from '../../_lib';

export const onRequestGet: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  const { results } = await env.DB.prepare(
    'SELECT id_hash AS id, created_at AS createdAt, seen_at AS seenAt, agent, country FROM sessions WHERE user_id = ? AND expires_at > unixepoch() ORDER BY seen_at DESC',
  ).bind(s.user.id).all<{ id: string }>();
  return json({ sessions: results.map((r) => ({ ...r, current: r.id === s.hash })) });
};

// Sign out everywhere else.
export const onRequestDelete: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id_hash != ?').bind(s.user.id, s.hash).run();
  return json({ ok: true });
};
