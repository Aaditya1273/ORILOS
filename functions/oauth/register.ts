import { cors, json, now, okRedirect, randomToken, readJson, type Fn } from '../_lib';

// RFC 7591 dynamic client registration: claude.ai registers itself the first time someone adds the connector.
// Public clients only (no secret); PKCE protects the code. ponytail: unauthenticated by design (the spec's open
// registration); add a per-IP rate limit if rows ever pile up.
export const onRequestPost: Fn = async ({ request, env }) => {
  const body = await readJson<{ redirect_uris: string[]; client_name: string }>(request);
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String).slice(0, 5) : [];
  if (!uris.length || !uris.every(okRedirect))
    return json({ error: 'invalid_redirect_uri', error_description: 'Redirect URIs must be https (or http on localhost).' }, 400, cors);
  const name = String(body.client_name ?? '').replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 60) || 'MCP client';
  const id = `oc_${randomToken(16)}`;
  const issued = now();
  await env.DB.prepare('INSERT INTO oauth_clients (id, name, redirect_uris, created_at) VALUES (?, ?, ?, ?)').bind(id, name, JSON.stringify(uris), issued).run();
  return json(
    {
      client_id: id,
      client_id_issued_at: issued,
      client_name: name,
      redirect_uris: uris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
    201,
    cors,
  );
};
export const onRequestOptions: Fn = async () => new Response(null, { status: 204, headers: cors });
