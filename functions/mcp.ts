import { bearerUser, bridgeFor, cors, json, type Fn } from './_lib';

// The address people add in claude.ai (Settings > Connectors): https://orilos.pages.dev/mcp
// Streamable HTTP, JSON responses. initialize and tools/list are answered here from the app's last "hello", so Claude
// sees the tools even while the computer is off; everything else is relayed to the person's computer.
const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];
const SETUP =
  'ORILOS runs on your own computer. On that computer run `uvx orilos-mcp connect` and keep it open ' +
  '(first time: make a licence key at orilos.pages.dev/account/keys and run `uvx orilos-mcp activate <key>`). Then try again.';
const STATUS_TOOL = {
  name: 'orilos_status',
  description: 'Check whether ORILOS is running on your computer, and how to start it.',
  inputSchema: { type: 'object', properties: {} },
};

interface Rpc {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { protocolVersion?: string; name?: string };
}
interface Hello {
  serverInfo?: { version?: string };
  instructions?: string;
  tools?: unknown[];
}

const headers = { ...cors };

export const onRequestOptions: Fn = async () => new Response(null, { status: 204, headers });
export const onRequestGet: Fn = async () => new Response('Use POST.', { status: 405, headers: { ...headers, allow: 'POST' } });
export const onRequestDelete = onRequestGet;

export const onRequestPost: Fn = async ({ request, env }) => {
  const origin = new URL(request.url).origin;
  const userId = await bearerUser(env, request);
  if (!userId)
    return new Response(JSON.stringify({ error: 'invalid_token', error_description: 'Sign in to ORILOS.' }), {
      status: 401,
      headers: { ...headers, 'content-type': 'application/json', 'www-authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"` },
    });
  let body: Rpc | Rpc[];
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400, headers);
  }
  const bridge = bridgeFor(env, userId);
  let state: { online: boolean; hello: Hello | null } | undefined;
  const status = async () => (state ??= (await (await bridge.fetch('https://bridge/status')).json()) as { online: boolean; hello: Hello | null });

  const handle = async (m: Rpc): Promise<unknown> => {
    if (!m || typeof m !== 'object' || !m.method || m.id === undefined) return null; // notifications and stray responses
    const ok = (result: unknown) => ({ jsonrpc: '2.0', id: m.id, result });
    const text = (t: string, isError = false) => ok({ content: [{ type: 'text', text: t }], isError });
    switch (m.method) {
      case 'initialize': {
        const { hello } = await status();
        const asked = m.params?.protocolVersion ?? '';
        return ok({
          protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[1],
          capabilities: { tools: {} },
          serverInfo: { name: 'ORILOS', version: hello?.serverInfo?.version ?? 'connect' },
          instructions: hello?.instructions ?? SETUP,
        });
      }
      case 'ping':
        return ok({});
      case 'tools/list': {
        const { hello } = await status();
        return ok({ tools: [...(hello?.tools ?? []), STATUS_TOOL] });
      }
    }
    if (m.method === 'tools/call' && m.params?.name === STATUS_TOOL.name) {
      const { online, hello } = await status();
      return text(online ? `ORILOS ${hello?.serverInfo?.version ?? ''} is running on your computer and ready.` : `ORILOS is not running on your computer right now. ${SETUP}`);
    }
    const r = (await (await bridge.fetch('https://bridge/rpc', { method: 'POST', body: JSON.stringify(m) })).json()) as {
      message?: unknown;
      offline?: boolean;
      timeout?: boolean;
    };
    if (r.message) return r.message;
    if (m.method !== 'tools/call') return { jsonrpc: '2.0', id: m.id, error: { code: -32000, message: r.offline ? 'Your computer is not connected.' : 'Timed out.' } };
    return r.offline
      ? text(`Your computer is not connected to ORILOS. ${SETUP}`, true)
      : text('ORILOS is still working on this. Ask again in a minute (for clipping, use job_status).', true);
  };

  const out = (await Promise.all((Array.isArray(body) ? body : [body]).map(handle))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202, headers });
  return json(Array.isArray(body) ? out : out[0], 200, headers);
};
