import { cors, json, type Fn } from '../../_lib';

// RFC 9728: tells MCP clients that /mcp is protected and where to sign in (also answers .../mcp).
export const onRequestGet: Fn = async ({ request }) => {
  const origin = new URL(request.url).origin;
  return json({ resource: `${origin}/mcp`, authorization_servers: [origin], bearer_methods_supported: ['header'], scopes_supported: ['orilos'] }, 200, cors);
};
export const onRequestOptions: Fn = async () => new Response(null, { status: 204, headers: cors });
