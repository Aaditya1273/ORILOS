import { cookie, hint, newSession, now, OAUTH_COOKIE, randomToken, readCookie, safeNext, type Fn } from '../../_lib';

interface GoogleUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

// Step 2: Google sends the browser back here with a code. Check the state, swap the code, sign the user in.
export const onRequestGet: Fn = async ({ request, env }) => {
  const url = new URL(request.url);
  const back = (error: string) => Response.redirect(`${url.origin}/signin?error=${error}`, 302);
  // state.verifier.next, where next (URL-encoded) can itself contain dots, e.g. a consent URL with https://claude.ai
  const [state, verifier, ...rest] = (readCookie(request, OAUTH_COOKIE) ?? '').split('.');
  const next = rest.join('.');
  if (url.searchParams.get('error')) return back('cancelled');
  const code = url.searchParams.get('code');
  if (!code || !state || !verifier || url.searchParams.get('state') !== state) return back('expired');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) return back('google');
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) return back('google');
  const g = (await infoRes.json()) as GoogleUser;
  if (!g.sub || !g.email || !g.email_verified) return back('unverified');

  // New users get their Google name; returning users keep the name they chose.
  const user = await env.DB.prepare(
    `INSERT INTO users (id, google_sub, email, name, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, avatar = excluded.avatar
     RETURNING id`,
  ).bind(`u_${randomToken(12)}`, g.sub, g.email.toLowerCase(), (g.name ?? '').slice(0, 60), g.picture ?? '', now()).first<{ id: string }>();

  const headers = new Headers({ location: `${url.origin}${safeNext(decodeURIComponent(next ?? ''))}` });
  headers.append('set-cookie', await newSession(env, request, user!.id));
  headers.append('set-cookie', cookie(OAUTH_COOKIE, '', 0));
  headers.append('set-cookie', hint(true));
  return new Response(null, { status: 302, headers });
};
