import { billingReady, fail, json, paddle, session, type Fn } from '../../_lib';

// A fresh signed link to Paddle's customer portal: change plan, update the card, download invoices, cancel.
export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  if (!billingReady(env) || !s.user.sub_id || !s.user.customer_id) return fail(404, 'no_subscription', 'You are on the Free plan.');
  const res = await paddle(env, `/customers/${encodeURIComponent(s.user.customer_id)}/portal-sessions`, { subscription_ids: [s.user.sub_id] });
  if (!res.ok) {
    console.error('portal', res.status, await res.text());
    return fail(502, 'portal_failed', 'Billing did not open. Try again in a minute.');
  }
  const { data } = (await res.json()) as { data: { urls: { general: { overview: string }; subscriptions?: { view_subscription: string }[] } } };
  return json({ url: data.urls.subscriptions?.[0]?.view_subscription ?? data.urls.general.overview });
};
