import { bridgeFor, fail, json, session, type Fn } from '../../_lib';

// Is this account's computer connected right now? (The Claude page shows it live.)
export const onRequestGet: Fn = async ({ request, env }) => {
  const s = await session(env, request);
  if (!s) return fail(401, 'signed_out', 'Sign in to continue.');
  type Status = { online: boolean; hello: { serverInfo?: { version?: string }; tools?: unknown[]; device?: string } | null };
  // If the relay can't be reached, the honest answer is "not connected", not an error page.
  const r: Status = await bridgeFor(env, s.user.id)
    .fetch('https://bridge/status')
    .then((res) => res.json() as Promise<Status>)
    .catch(() => ({ online: false, hello: null }));
  return json({ online: r.online, version: r.hello?.serverInfo?.version ?? null, device: r.hello?.device ?? null, tools: r.hello?.tools?.length ?? 0 });
};
