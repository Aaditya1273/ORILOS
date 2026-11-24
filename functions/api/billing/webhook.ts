import { fail, json, planForPrice, toEpoch, verifySignature, type Fn } from '../../_lib';

interface Subscription {
  id: string;
  status: string;
  customer_id: string;
  custom_data: { user_id?: string } | null;
  items: { price: { id: string } }[];
  next_billed_at: string | null;
  canceled_at: string | null;
  scheduled_change: { action: string; effective_at: string } | null;
  updated_at: string;
}

// Paddle tells us when a subscription starts, renews, changes plan, fails to pay, is cancelled or ends.
// Deliveries can arrive out of order, so an older snapshot never overwrites a newer one.
export const onRequestPost: Fn = async ({ request, env }) => {
  const body = await request.text();
  if (!env.PADDLE_WEBHOOK_SECRET || !(await verifySignature(env.PADDLE_WEBHOOK_SECRET, body, request.headers.get('paddle-signature') ?? '')))
    return fail(401, 'bad_signature', 'Bad signature.');
  const event = JSON.parse(body) as { event_type: string; data: Subscription };
  if (!event.event_type?.startsWith('subscription.')) return json({ ok: true, ignored: event.event_type });

  const sub = event.data;
  const mapped = sub.items.map((i) => planForPrice(env, i.price.id)).find(Boolean);
  if (!mapped) return json({ ok: true, ignored: 'unknown_price' });
  const ends = sub.scheduled_change?.action === 'cancel' ? sub.scheduled_change.effective_at : sub.canceled_at;
  const userId = sub.custom_data?.user_id;
  await env.DB.prepare(
    `UPDATE users SET plan = ?, sub_id = ?, sub_status = ?, sub_interval = ?, sub_renews_at = ?, sub_ends_at = ?, customer_id = ?, sub_event_at = ?
     WHERE ${userId ? 'id = ?' : 'sub_id = ?'} AND (sub_event_at IS NULL OR sub_event_at <= ? OR sub_id IS NOT ?)
       AND (sub_id IS NULL OR sub_id = ? OR sub_status IS NULL OR sub_status NOT IN ('active', 'trialing', 'past_due'))`,
  ).bind(mapped.plan, sub.id, sub.status, mapped.interval, toEpoch(sub.next_billed_at), toEpoch(ends), sub.customer_id, sub.updated_at, userId ?? sub.id, sub.updated_at, sub.id, sub.id).run();
  return json({ ok: true });
};
