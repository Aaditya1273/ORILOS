import { LIVE_STATUSES } from '../../../src/account/plans';
import { billingReady, fail, json, now, paddle, REFUND_DAYS, session, toEpoch, type Env, type Fn, type User } from '../../_lib';

// Cancelling from ORILOS Billing. Within 14 days of the first payment (once per account) it refunds that payment in full
// and the plan ends now; after that there is no refund and the plan runs to the end of the paid period. No partial refunds.

interface Sub {
  id: string;
  status: string;
  first_billed_at: string | null;
  updated_at: string;
  scheduled_change: { action: string; effective_at: string } | null;
}

async function current(env: Env, user: User): Promise<{ sub: Sub; refundable: boolean; until: number } | null> {
  if (!user.sub_id || !LIVE_STATUSES.has(user.sub_status ?? '')) return null;
  const res = await paddle(env, `/subscriptions/${encodeURIComponent(user.sub_id)}`);
  if (!res.ok) throw new Error(`subscription ${res.status}`);
  const sub = ((await res.json()) as { data: Sub }).data;
  const until = (toEpoch(sub.first_billed_at) ?? 0) + REFUND_DAYS * 86400;
  return { sub, refundable: !user.refunded_at && now() < until, until };
}

/** What cancelling would do right now, for the confirm step. */
export const onRequestGet: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  if (!billingReady(env)) return fail(404, 'no_subscription', 'You are on the Free plan.');
  const c = await current(env, s.user);
  if (!c) return fail(404, 'no_subscription', 'You are on the Free plan.');
  return json({ refundable: c.refundable, refundUntil: c.refundable ? c.until : null, cancelled: c.sub.scheduled_change?.action === 'cancel' });
};

export const onRequestPost: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  if (!billingReady(env)) return fail(404, 'no_subscription', 'You are on the Free plan.');
  const c = await current(env, s.user);
  if (!c) return fail(404, 'no_subscription', 'You are on the Free plan.');
  const subPath = `/subscriptions/${encodeURIComponent(c.sub.id)}/cancel`;

  if (c.refundable) {
    // Refund first: if that fails nothing changes, so nobody loses their plan without their money.
    const txns = await paddle(env, `/transactions?subscription_id=${encodeURIComponent(c.sub.id)}&status=completed&order_by=${encodeURIComponent('billed_at[ASC]')}&per_page=1`);
    const first = txns.ok ? ((await txns.json()) as { data: { id: string }[] }).data[0] : undefined;
    const refund = first && (await paddle(env, '/adjustments', { action: 'refund', type: 'full', transaction_id: first.id, reason: 'Cancelled within 14 days of the first payment' }));
    if (!refund || !refund.ok) {
      console.error('refund', first?.id, refund ? `${refund.status} ${await refund.text()}` : 'no completed transaction');
      return fail(502, 'refund_failed', 'The refund did not go through, so nothing was cancelled. Try again in a minute or email aaditya@agentmd.tech.');
    }
    await env.DB.prepare('UPDATE users SET refunded_at = ? WHERE id = ?').bind(now(), s.user.id).run();
    if (c.sub.scheduled_change) await paddle(env, `/subscriptions/${encodeURIComponent(c.sub.id)}`, { scheduled_change: null }, 'PATCH');
    const res = await paddle(env, subPath, { effective_from: 'immediately' });
    if (!res.ok) {
      console.error('cancel after refund', res.status, await res.text());
      return fail(502, 'cancel_failed', 'Your refund is on its way, but cancelling did not finish. Email aaditya@agentmd.tech and we will end it right away.');
    }
    const sub = ((await res.json()) as { data: Sub }).data;
    await env.DB.prepare('UPDATE users SET sub_status = ?, sub_renews_at = NULL, sub_ends_at = ?, sub_event_at = ? WHERE id = ?')
      .bind(sub.status, now(), sub.updated_at, s.user.id).run();
    return json({ refunded: true });
  }

  if (c.sub.scheduled_change?.action === 'cancel') return json({ refunded: false, endsAt: toEpoch(c.sub.scheduled_change.effective_at) });
  const res = await paddle(env, subPath, {});
  if (!res.ok) {
    console.error('cancel', res.status, await res.text());
    return fail(502, 'cancel_failed', 'Cancelling did not go through. Try again in a minute.');
  }
  const sub = ((await res.json()) as { data: Sub }).data;
  await env.DB.prepare('UPDATE users SET sub_status = ?, sub_ends_at = ?, sub_event_at = ? WHERE id = ?')
    .bind(sub.status, toEpoch(sub.scheduled_change?.effective_at ?? null), sub.updated_at, s.user.id).run();
  return json({ refunded: false, endsAt: toEpoch(sub.scheduled_change?.effective_at ?? null) });
};
