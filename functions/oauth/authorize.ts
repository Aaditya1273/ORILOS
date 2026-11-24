import { checkAuthorize, session, type Fn } from '../_lib';

// Step 1 of signing in from claude.ai: check the request, then send the person to sign in (if needed) and approve.
export const onRequestGet: Fn = async ({ request, env }) => {
  const url = new URL(request.url);
  const checked = await checkAuthorize(env, url.searchParams);
  if ('error' in checked) return new Response(`ORILOS sign-in: ${checked.error}`, { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const consent = `/oauth/consent${url.search}`;
  const signedIn = await session(env, request);
  return Response.redirect(`${url.origin}${signedIn ? consent : `/signin?next=${encodeURIComponent(consent)}`}`, 302);
};
