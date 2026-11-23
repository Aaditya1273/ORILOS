import { LIVE_STATUSES } from '../../../src/account/plans';
import { billingReady, fail, json, lemon, readJson, session, variantFor, type Fn } from '../../_lib';

export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  if (!billingReady(env)) return fail(503, 'billing_unavailable', 'Payments open soon.');
  const body = await readJson<{ plan: string; interval: string }>(request);
  const plan = body.plan === 'team' ? 'team' : body.plan === 'pro' ? 'pro' : null;
  const interval = body.interval === 'yearly' ? 'yearly' : 'monthly';
  const variant = plan ? variantFor(env, plan, interval) : '';
  if (!variant) return fail(400, 'bad_plan', 'Pick Pro or Team.');
  if (s.user.sub_id && LIVE_STATUSES.has(s.user.sub_status ?? ''))
    return fail(409, 'has_subscription', 'You already have a plan. Change it from Manage billing.');

  const origin = new URL(request.url).origin;
  const res = await lemon(env, '/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: { email: s.user.email, name: s.user.name, custom: { user_id: s.user.id } },
          product_options: { redirect_url: `${origin}/account/billing?paid=1` },
        },
        relationships: {
          store: { data: { type: 'stores', id: env.LS_STORE_ID } },
          variant: { data: { type: 'variants', id: variant } },
        },
      },
    }),
  });
  if (!res.ok) {
    console.error('checkout', res.status, await res.text());
    return fail(502, 'checkout_failed', 'The payment page did not open. Try again in a minute.');
  }
  const { data } = (await res.json()) as { data: { attributes: { url: string } } };
  return json({ url: data.attributes.url });
};
