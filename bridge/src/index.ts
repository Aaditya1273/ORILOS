import { DurableObject } from 'cloudflare:workers';

// One per account. The ORILOS app on the person's computer keeps a websocket open here; requests from claude.ai
// arrive as /rpc calls, go down the socket with a fresh id, and the answer is matched back by that id.
// Nothing is stored except the app's last "hello" (its tool list), so Claude still sees the tools while it is offline.
const TIMEOUT_MS = 280_000; // claude.ai gives a tool call about five minutes; clip tools return within 45 s by design

export class Bridge extends DurableObject {
  private pending = new Map<string, (v: unknown) => void>();

  /** The connected computer, skipping sockets closed by a revoke or a newer connection. */
  private open(): WebSocket | undefined {
    return this.ctx.getWebSockets().find((w) => w.readyState === WebSocket.OPEN);
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.headers.get('upgrade') === 'websocket') {
      for (const old of this.ctx.getWebSockets()) old.close(4000, 'Another computer connected.');
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server, [request.headers.get('x-orilos-key') ?? 'key']);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === '/status') {
      const hello = (await this.ctx.storage.get<Record<string, unknown>>('hello')) ?? null;
      return Response.json({ online: !!this.open(), hello });
    }
    if (path === '/close' && request.method === 'POST') {
      // A key was revoked (close its socket) or the account was deleted (close all and forget the tool list).
      const key = new URL(request.url).searchParams.get('key');
      for (const ws of key ? this.ctx.getWebSockets(key) : this.ctx.getWebSockets()) ws.close(4001, 'This licence key was revoked.');
      if (!key) await this.ctx.storage.deleteAll();
      return Response.json({ ok: true });
    }
    if (path === '/rpc' && request.method === 'POST') {
      const ws = this.open();
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
