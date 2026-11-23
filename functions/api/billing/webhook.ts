import { fail, json, planForVariant, toEpoch, verifySignature, type Fn } from '../../_lib';

interface Event {
  meta: { event_name: string; custom_data?: { user_id?: string } };
  data: {
    type: string;
    id: string;
    attributes: { status: string; variant_id: number; customer_id: number; renews_at: string | null; ends_at: string | null };
  };
}

// Lemon Squeezy tells us when a subscription starts, changes, renews, is cancelled or expires.
// ponytail: last event wins; compare attributes.updated_at if out-of-order deliveries ever bite.
export const onRequestPost: Fn = async ({ request, env }) => {
  const body = await request.text();
  if (!env.LS_WEBHOOK_SECRET || !(await verifySignature(env.LS_WEBHOOK_SECRET, body, request.headers.get('x-signature') ?? '')))
    return fail(401, 'bad_signature', 'Bad signature.');
  const event = JSON.parse(body) as Event;
  if (event.data?.type !== 'subscriptions') return json({ ok: true, ignored: event.meta?.event_name });

  const a = event.data.attributes;
  const mapped = planForVariant(env, a.variant_id);
  if (!mapped) return json({ ok: true, ignored: 'unknown_variant' });
  const userId = event.meta.custom_data?.user_id;
  const where = userId ? 'id = ?' : 'sub_id = ?';
  await env.DB.prepare(
    `UPDATE users SET plan = ?, sub_id = ?, sub_status = ?, sub_interval = ?, sub_renews_at = ?, sub_ends_at = ?, customer_id = ? WHERE ${where}`,
  ).bind(mapped.plan, event.data.id, a.status, mapped.interval, toEpoch(a.renews_at), toEpoch(a.ends_at), String(a.customer_id), userId ?? event.data.id).run();
  return json({ ok: true });
};
