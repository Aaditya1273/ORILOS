import { ACCESS_TTL, b64url, cors, json, now, randomToken, REFRESH_TTL, sha256, sha256hex, type Env, type Fn } from '../_lib';

// Step 3: the app trades the one-time code (with its PKCE verifier) for tokens, and later refreshes them.
// Tokens are stored as hashes; a refresh rotates both.
const bad = (error: string, description: string) => json({ error, error_description: description }, 400, cors);

async function params(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]));
  }
  return new URLSearchParams(await request.text());
}

async function issue(env: Env, userId: string, clientId: string, rowId?: string) {
  const access = `ort_${randomToken(32)}`;
  const refresh = `orr_${randomToken(32)}`;
  const t = now();
  const values = [await sha256hex(access), await sha256hex(refresh), t + ACCESS_TTL, t + REFRESH_TTL];
  if (rowId)
    await env.DB.prepare('UPDATE oauth_tokens SET access_hash = ?, refresh_hash = ?, access_expires = ?, refresh_expires = ? WHERE id = ?')
      .bind(...values, rowId)
      .run();
  else
    await env.DB.prepare(
      'INSERT INTO oauth_tokens (id, user_id, client_id, access_hash, refresh_hash, access_expires, refresh_expires, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(`ot_${randomToken(9)}`, userId, clientId, ...values, t)
      .run();
  return json({ access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL, refresh_token: refresh, scope: 'orilos' }, 200, cors);
}

export const onRequestPost: Fn = async ({ request, env }) => {
  const p = await params(request);
  const clientId = p.get('client_id') ?? '';
  if (p.get('grant_type') === 'authorization_code') {
    const hash = await sha256hex(p.get('code') ?? '');
    const row = await env.DB.prepare('SELECT * FROM oauth_codes WHERE hash = ?')
      .bind(hash)
      .first<{ client_id: string; user_id: string; redirect_uri: string; code_challenge: string; expires_at: number }>();
    await env.DB.prepare('DELETE FROM oauth_codes WHERE hash = ?').bind(hash).run(); // single use, even when it fails
    if (!row || row.expires_at < now()) return bad('invalid_grant', 'The sign-in code expired. Try connecting again.');
    if (row.client_id !== clientId || row.redirect_uri !== p.get('redirect_uri')) return bad('invalid_grant', 'This code belongs to another app.');
    if (b64url(await sha256(p.get('code_verifier') ?? '')) !== row.code_challenge) return bad('invalid_grant', 'PKCE check failed.');
    return issue(env, row.user_id, clientId);
  }
  if (p.get('grant_type') === 'refresh_token') {
    const row = await env.DB.prepare('SELECT id, user_id, client_id, refresh_expires FROM oauth_tokens WHERE refresh_hash = ?')
      .bind(await sha256hex(p.get('refresh_token') ?? ''))
      .first<{ id: string; user_id: string; client_id: string; refresh_expires: number }>();
    if (!row || row.refresh_expires < now() || row.client_id !== clientId) return bad('invalid_grant', 'Sign in again.');
    return issue(env, row.user_id, clientId, row.id);
  }
  return bad('unsupported_grant_type', 'Use authorization_code or refresh_token.');
};
export const onRequestOptions: Fn = async () => new Response(null, { status: 204, headers: cors });
