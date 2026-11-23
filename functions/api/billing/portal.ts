import { billingReady, fail, json, lemon, session, type Fn } from '../../_lib';

// A fresh signed link to the customer portal: change plan, update the card, download invoices, cancel.
export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  if (!billingReady(env) || !s.user.sub_id) return fail(404, 'no_subscription', 'You are on the Free plan.');
  const res = await lemon(env, `/subscriptions/${encodeURIComponent(s.user.sub_id)}`);
  if (!res.ok) return fail(502, 'portal_failed', 'Billing did not open. Try again in a minute.');
  const { data } = (await res.json()) as { data: { attributes: { urls: { customer_portal: string } } } };
  return json({ url: data.attributes.urls.customer_portal });
};
