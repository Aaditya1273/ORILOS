import { fail, json, oauthClient, session, type Fn } from '../../_lib';

// For the consent page: which app is asking, and where it will send the person back.
export const onRequestGet: Fn = async ({ request, env }) => {
  if (!(await session(env, request))) return fail(401, 'signed_out', 'Sign in to continue.');
  const u = new URL(request.url);
  const c = await oauthClient(env, u.searchParams.get('client_id') ?? '');
  const redirect = u.searchParams.get('redirect_uri') ?? '';
  if (!c || !c.uris.includes(redirect)) return fail(404, 'unknown_client', 'Unknown app.');
  return json({ name: c.name, host: new URL(redirect).host });
};
