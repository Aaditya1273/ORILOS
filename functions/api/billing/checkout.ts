import { LIVE_STATUSES } from '../../../src/account/plans';
import { billingReady, fail, json, paddle, paddleEnv, priceFor, readJson, session, type Fn } from '../../_lib';

// A Paddle transaction for the chosen plan, made here so the account it belongs to can't be changed by the browser.
// The browser opens it in Paddle's checkout overlay.
export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  if (!billingReady(env)) return fail(503, 'billing_unavailable', 'Payments open soon.');
  const body = await readJson<{ plan: string; interval: string }>(request);
  const plan = body.plan === 'team' ? 'team' : body.plan === 'pro' ? 'pro' : null;
  const interval = body.interval === 'yearly' ? 'yearly' : 'monthly';
  const price = plan ? priceFor(env, plan, interval) : '';
  if (!price) return fail(400, 'bad_plan', 'Pick Pro or Team.');
  if (s.user.sub_id && LIVE_STATUSES.has(s.user.sub_status ?? ''))
    return fail(409, 'has_subscription', 'You already have a plan. Change it from Manage billing.');

  const res = await paddle(env, '/transactions', {
    items: [{ price_id: price, quantity: 1 }],
    custom_data: { user_id: s.user.id },
    ...(s.user.customer_id ? { customer_id: s.user.customer_id } : {}),
  });
  if (!res.ok) {
    console.error('checkout', res.status, await res.text());
    return fail(502, 'checkout_failed', 'The payment page did not open. Try again in a minute.');
  }
  const { data } = (await res.json()) as { data: { id: string } };
  return json({ transactionId: data.id, email: s.user.customer_id ? null : s.user.email, token: env.PADDLE_CLIENT_TOKEN, environment: paddleEnv(env) });
};
