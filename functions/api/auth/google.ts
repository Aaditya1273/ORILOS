import { b64url, cookie, OAUTH_COOKIE, randomToken, safeNext, sha256, type Fn } from '../../_lib';

// Step 1 of "Sign in with Google": send the browser to Google with a state and a PKCE challenge.
export const onRequestGet: Fn = async ({ request, env }) => {
  const url = new URL(request.url);
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return Response.redirect(`${url.origin}/signin?error=unavailable`, 302);
  const state = randomToken(24);
  const verifier = randomToken(48);
  const next = safeNext(url.searchParams.get('next'));
  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: b64url(await sha256(verifier)),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return new Response(null, {
    status: 302,
    headers: { location: google.toString(), 'set-cookie': cookie(OAUTH_COOKIE, `${state}.${verifier}.${encodeURIComponent(next)}`, 600) },
  });
};
