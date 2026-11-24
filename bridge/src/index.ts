import { DurableObject } from 'cloudflare:workers';

// One per account. The ORILOS app on the person's computer keeps a websocket open here; requests from claude.ai
// arrive as /rpc calls, go down the socket with a fresh id, and the answer is matched back by that id.
// Nothing is stored except the app's last "hello" (its tool list), so Claude still sees the tools while it is offline.
const TIMEOUT_MS = 280_000; // claude.ai gives a tool call about five minutes; clip tools return within 45 s by design

export class Bridge extends DurableObject {
  private pending = new Map<string, (v: unknown) => void>();

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.headers.get('upgrade') === 'websocket') {
      for (const old of this.ctx.getWebSockets()) old.close(4000, 'Another computer connected.');
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === '/status') {
      const hello = (await this.ctx.storage.get<Record<string, unknown>>('hello')) ?? null;
      return Response.json({ online: this.ctx.getWebSockets().length > 0, hello });
    }
    if (path === '/rpc' && request.method === 'POST') {
      const ws = this.ctx.getWebSockets()[0];
      if (!ws) return Response.json({ offline: true });
      const id = crypto.randomUUID();
      const answer = new Promise((resolve) => {
        this.pending.set(id, resolve);
        setTimeout(() => this.pending.delete(id) && resolve({ timeout: true }), TIMEOUT_MS);
      });
      ws.send(JSON.stringify({ type: 'rpc', id, message: await request.json() }));
      return Response.json(await answer);
    }
    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(_ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    let m: { type?: string; id?: string; message?: unknown };
    try {
      m = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data));
    } catch {
      return;
    }
    if (m.type === 'hello') await this.ctx.storage.put('hello', m);
    else if (m.type === 'rpc' && m.id) {
      const done = this.pending.get(m.id);
      if (done) {
        this.pending.delete(m.id);
        done({ message: m.message });
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    ws.close(code === 1005 ? 1000 : code, 'closed');
    if (!this.ctx.getWebSockets().length) for (const [id, done] of this.pending) (this.pending.delete(id), done({ offline: true }));
  }
}

export default { fetch: () => new Response('ORILOS bridge', { status: 404 }) };
