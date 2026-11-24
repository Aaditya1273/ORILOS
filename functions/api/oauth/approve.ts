import { checkAuthorize, fail, json, now, randomToken, readJson, session, sha256hex, type Fn } from '../../_lib';

// Step 2: the signed-in person allows (or denies) the app. Re-checks the whole request, then mints a one-time code.
export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  const body = await readJson<{ query: string; allow: boolean }>(request);
  const p = new URLSearchParams(String(body.query ?? ''));
  const checked = await checkAuthorize(env, p);
  if ('error' in checked) return fail(400, 'bad_request', checked.error);
  const back = new URL(p.get('redirect_uri')!);
  const state = p.get('state');
  if (state) back.searchParams.set('state', state);
  if (!body.allow) {
    back.searchParams.set('error', 'access_denied');
    return json({ redirect: back.toString() });
  }
  const code = randomToken(32);
  await env.DB.prepare('INSERT INTO oauth_codes (hash, client_id, user_id, redirect_uri, code_challenge, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(await sha256hex(code), checked.client.id, s.user.id, p.get('redirect_uri'), p.get('code_challenge'), now() + 600)
    .run();
  back.searchParams.set('code', code);
  return json({ redirect: back.toString() });
};
