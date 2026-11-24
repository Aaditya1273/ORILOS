import { cors, json, type Fn } from '../../_lib';

// RFC 8414 metadata for ORILOS Connect sign-in: public clients, authorization code + PKCE (S256), refresh tokens.
export const onRequestGet: Fn = async ({ request }) => {
  const o = new URL(request.url).origin;
  return json(
    {
      issuer: o,
      authorization_endpoint: `${o}/oauth/authorize`,
      token_endpoint: `${o}/oauth/token`,
      registration_endpoint: `${o}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['orilos'],
    },
    200,
    cors,
  );
};
export const onRequestOptions: Fn = async () => new Response(null, { status: 204, headers: cors });
