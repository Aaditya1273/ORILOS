import { fail, type Fn } from '../_lib';

// Calls from other machines that don't use the browser session: payment webhooks and the ORILOS app.
const EXTERNAL = new Set(['/api/billing/webhook', '/api/licence']);

export const onRequest: Fn = async ({ request, next }) => {
  const url = new URL(request.url);
  // CSRF: a state-changing request from a page must come from this site (the session cookie is also SameSite=Lax).
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !EXTERNAL.has(url.pathname) && request.headers.get('origin') !== url.origin)
    return fail(403, 'bad_origin', 'Request blocked.');
  try {
    const res = await next();
    if (!res.headers.has('cache-control')) {
      const out = new Response(res.body, res);
      out.headers.set('cache-control', 'no-store');
      return out;
    }
    return res;
  } catch (e) {
    console.error(e);
    return fail(500, 'server_error', 'Something went wrong on our side. Try again in a minute.');
  }
};
