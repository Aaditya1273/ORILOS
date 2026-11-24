import { fail, json, session, type Fn } from '../../../_lib';

// Apps connected to this account through ORILOS Connect (for Settings).
export const onRequestGet: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  const { results } = await env.DB.prepare(
    `SELECT t.id, c.name, t.created_at AS createdAt, t.used_at AS usedAt FROM oauth_tokens t JOIN oauth_clients c ON c.id = t.client_id
     WHERE t.user_id = ? ORDER BY t.created_at DESC`,
  )
    .bind(s.user.id)
    .all();
  return json({ apps: results });
};
