import type { Source } from './types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = 90_000;

export type GeminiErrorKind = 'auth' | 'quota' | 'model' | 'overloaded' | 'network' | 'blocked' | 'malformed' | 'cancelled' | 'other';

export class GeminiError extends Error {
  constructor(
    public kind: GeminiErrorKind,
    message: string,
    public daily = false,
    public retryAfterMs?: number,
  ) {
    super(message);
  }
}

/** Never let a key-shaped string reach a message, log or the UI. */
export const redact = (s: string) => s.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[key]').replace(/key=[^&\s]+/g, 'key=[key]');

function errorFrom(status: number, body: string): GeminiError {
  let msg = `HTTP ${status}`;
  let code = '';
  let daily = false;
  let retry: number | undefined;
  try {
    const err = JSON.parse(body).error;
    msg = redact(String(err.message ?? msg));
    code = String(err.status ?? '');
    for (const d of err.details ?? []) if (typeof d.retryDelay === 'string') retry = Math.min(60_000, parseFloat(d.retryDelay) * 1000 + 500);
    for (const d of err.details ?? []) for (const v of d.violations ?? []) if (String(v.quotaId).includes('PerDay')) daily = true;
  } catch {
    // Non-JSON body: keep the HTTP code.
  }
  const first = msg.split('\n')[0];
  if (status === 429 || code === 'RESOURCE_EXHAUSTED') return new GeminiError('quota', daily ? `Daily free limit reached for this model: ${first}` : `Gemini is rate-limiting this key: ${first}`, daily, retry);
  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID/.test(msg)) return new GeminiError('auth', 'Gemini rejected the API key. Check it in Settings → AI key.');
  if (status === 404 || /no longer available|is not found for API version|not supported for generateContent/.test(msg)) return new GeminiError('model', `Model unavailable: ${first}`);
  if (status === 503 || status === 500) return new GeminiError('overloaded', `Gemini is busy right now: ${first}`);
  return new GeminiError('other', `Gemini error: ${first}`);
}

// ── Model catalogue policy (same as the Android app) ─────────────────────

const exclude = /lite|image|tts|live|audio|embedding|vision|exp|preview|transcribe|omni|robotics|computer|customtools|research/;
const isGeneral = (m: string) => m.startsWith('gemini') && !exclude.test(m);
const version = (m: string) => Number(m.match(/gemini-(\d+(?:\.\d+)?)-/)?.[1] ?? 0);
const newest = (ms: string[]) => [...ms].sort((a, b) => version(b) - version(a))[0];

export function pickModel(models: string[]): string | undefined {
  if (models.includes('gemini-flash-latest')) return 'gemini-flash-latest';
  return newest(models.filter((m) => isGeneral(m) && /^gemini-[\d.]+-flash$/.test(m))) ?? newest(models.filter(isGeneral));
}

export function pickLite(models: string[]): string | undefined {
  if (models.includes('gemini-flash-lite-latest')) return 'gemini-flash-lite-latest';
  return newest(models.filter((m) => /^gemini-[\d.]+-flash-lite$/.test(m)));
}

export const pickImageModel = (models: string[]) => newest(models.filter((m) => m.startsWith('gemini') && /-flash-image(-preview)?$/.test(m)));

/** Gemini's responseSchema uses upper-case OpenAPI type names. */
function schemaFor(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(schemaFor);
  if (s && typeof s === 'object') return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'type' ? String(v).toUpperCase() : schemaFor(v)]));
  return s;
}

type Json = Record<string, unknown>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function textOf(res: Json): string {
  const cands = (res.candidates as Json[] | undefined) ?? [];
  if (!cands.length) {
    const block = (res.promptFeedback as Json | undefined)?.blockReason;
    throw new GeminiError('blocked', block ? `Gemini blocked the request (${block})` : 'Gemini returned no answer');
  }
  const c = cands[0];
  const reason = String(c.finishReason ?? '');
  const parts = ((c.content as Json | undefined)?.parts as Json[] | undefined) ?? [];
  const t = parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('');
  // A cut-off answer is never passed on as if it were complete.
  if (reason === 'MAX_TOKENS') throw new GeminiError('malformed', "Gemini's answer was cut off");
  if (!t.trim()) {
    if (['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(reason)) throw new GeminiError('blocked', `Gemini declined to answer (${reason})`);
    throw new GeminiError('malformed', 'Gemini returned an empty answer');
  }
  return t;
}

export interface Grounded {
  text: string;
  sources: Source[];
  /** Statement → indices into sources. */
  claims: [string, number[]][];
  /** URLs Gemini actually managed to read (url_context). */
  read: string[];
}

/**
 * Gemini over plain fetch (no SDK). Calls run on a picked model and fall back
 * when the live API disagrees: retired model → re-pick; overload or daily
 * limit → try another model (Flash-Lite last), at most 4 per call.
 */
export class Gemini {
  private models?: string[];
  private rejected = new Set<string>();
  private cooling = new Map<string, number>();
  lastModel?: string;

  constructor(private key: () => Promise<string | undefined>) {}

  private async request(path: string, init: RequestInit, signal?: AbortSignal): Promise<Json> {
    const key = await this.key();
    if (!key) throw new GeminiError('auth', 'Add your Gemini key first (Settings → AI key).');
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${BASE}/${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        referrerPolicy: 'no-referrer',
      });
    } catch (e) {
      if (signal?.aborted) throw new GeminiError('cancelled', 'Stopped');
      if (timeout.aborted) throw new GeminiError('network', 'Gemini did not answer in time');
      throw new GeminiError('network', navigator.onLine ? `Could not reach Gemini (${redact(String(e))})` : 'You are offline');
    }
    const body = await res.text();
    if (!res.ok) throw errorFrom(res.status, body);
    try {
      return JSON.parse(body);
    } catch {
      throw new GeminiError('other', 'Gemini returned a non-JSON response');
    }
  }

  async listModels(refresh = false): Promise<string[]> {
    if (this.models && !refresh) return this.models;
    const res = await this.request('models?pageSize=1000', { method: 'GET' });
    this.models = ((res.models as Json[]) ?? [])
      .filter((m) => ((m.supportedGenerationMethods as string[]) ?? []).includes('generateContent'))
      .map((m) => String(m.name).replace(/^models\//, ''));
    return this.models;
  }

  private async next(tried: Set<string>): Promise<string | undefined> {
    const now = Date.now();
    const left = (await this.listModels()).filter((m) => !this.rejected.has(m) && !tried.has(m) && (this.cooling.get(m) ?? 0) < now);
    return tried.size >= 3 ? (pickLite(left) ?? pickModel(left)) : (pickModel(left) ?? pickLite(left));
  }

  private async run<T>(call: (model: string) => Promise<T>): Promise<T> {
    const tried = new Set<string>();
    let waited = false;
    let model = await this.next(tried);
    if (!model) throw new GeminiError('model', 'No Gemini text model is available for this key');
    for (;;) {
      tried.add(model);
      this.lastModel = model;
      try {
        return await call(model);
      } catch (e) {
        // Per-minute limit: the free tier allows only a few calls a minute, so wait it out once.
        if (e instanceof GeminiError && e.kind === 'quota' && !e.daily && e.retryAfterMs && !waited) {
          waited = true;
          await sleep(e.retryAfterMs);
          continue;
        }
        if (!(e instanceof GeminiError) || tried.size >= 4) throw e;
        if (e.kind === 'model') {
          this.rejected.add(model);
          await this.listModels(true);
        } else if ((e.kind === 'quota' && e.daily) || e.kind === 'overloaded') {
          this.cooling.set(model, Date.now() + (e.kind === 'quota' ? 12 * 3600_000 : 5 * 60_000));
        } else {
          throw e;
        }
        const alt = await this.next(tried);
        if (!alt) throw e;
        model = alt;
      }
    }
  }

  private generate(model: string, body: Json, signal?: AbortSignal) {
    return this.request(`models/${model}:generateContent`, { method: 'POST', body: JSON.stringify(body) }, signal);
  }

  private body(prompt: string, system: string | undefined, config: Json, tools?: Json[]): Json {
    return {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: config,
      ...(tools ? { tools } : {}),
    };
  }

  /** Structured output against a JSON schema, with one corrective retry. */
  async json<T = Json>(prompt: string, schema: object, opts: { system?: string; temperature?: number; signal?: AbortSignal } = {}): Promise<T> {
    const config = { temperature: opts.temperature ?? 0.4, responseMimeType: 'application/json', responseSchema: schemaFor(schema) };
    const required = ((schema as Json).required as string[] | undefined) ?? [];
    const parse = (t: string) => {
      let j: Json;
      try {
        j = JSON.parse(t.replace(/^```(?:json)?\s*|\s*```$/g, ''));
      } catch {
        throw new GeminiError('malformed', 'answer was not valid JSON');
      }
      const missing = required.filter((k) => j[k] === undefined || j[k] === null || j[k] === '');
      if (missing.length) throw new GeminiError('malformed', `missing ${missing.join(', ')}`);
      return j as T;
    };
    return this.run(async (m) => {
      try {
        return parse(textOf(await this.generate(m, this.body(prompt, opts.system, config), opts.signal)));
      } catch (e) {
        if (!(e instanceof GeminiError) || e.kind !== 'malformed') throw e;
        const fix = `${prompt}\n\nYour previous answer was invalid (${e.message}). Return ONLY one JSON object matching the schema, with every required field filled.`;
        return parse(textOf(await this.generate(m, this.body(fix, opts.system, config), opts.signal)));
      }
    });
  }

  /**
   * Web research done by Google, not by this page: Google Search grounding
   * and/or URL context (Gemini reads the pages). Returns cited statements.
   */
  async grounded(prompt: string, tools: ('search' | 'urls')[], opts: { system?: string; signal?: AbortSignal } = {}): Promise<Grounded> {
    const t = tools.map((x) => (x === 'search' ? { google_search: {} } : { url_context: {} }));
    const res = await this.run((m) => this.generate(m, this.body(prompt, opts.system, { temperature: 0.2 }, t), opts.signal));
    const text = textOf(res);
    const c = ((res.candidates as Json[])[0] ?? {}) as Json;
    const meta = (c.groundingMetadata as Json | undefined) ?? {};
    const sources = ((meta.groundingChunks as Json[] | undefined) ?? [])
      .map((ch) => ch.web as Json | undefined)
      .filter((w): w is Json => !!w)
      .map((w) => ({ title: String(w.title ?? ''), url: String(w.uri ?? '') }));
    const claims = ((meta.groundingSupports as Json[] | undefined) ?? [])
      .map((s): [string, number[]] => [String((s.segment as Json | undefined)?.text ?? ''), ((s.groundingChunkIndices as number[]) ?? []).map(Number)])
      .filter(([s]) => s.trim());
    const urlMeta = ((c.urlContextMetadata ?? c.url_context_metadata) as Json | undefined) ?? {};
    const read = ((urlMeta.urlMetadata ?? urlMeta.url_metadata ?? []) as Json[])
      .filter((u) => String(u.urlRetrievalStatus ?? u.url_retrieval_status ?? '').includes('SUCCESS'))
      .map((u) => String(u.retrievedUrl ?? u.retrieved_url ?? ''));
    return { text, sources, claims, read };
  }

  /** Gemini image models need a paid-tier key; the free tier has no image quota. */
  async image(prompt: string, signal?: AbortSignal): Promise<Blob> {
    const model = pickImageModel(await this.listModels());
    if (!model) throw new GeminiError('model', 'This key has no Gemini image model');
    const res = await this.generate(model, { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }, signal);
    for (const c of (res.candidates as Json[]) ?? []) {
      for (const p of ((c.content as Json | undefined)?.parts as Json[]) ?? []) {
        const inline = (p.inlineData ?? p.inline_data) as Json | undefined;
        if (inline?.data) {
          const bytes = Uint8Array.from(atob(String(inline.data)), (ch) => ch.charCodeAt(0));
          return new Blob([bytes], { type: String(inline.mimeType ?? inline.mime_type ?? 'image/png') });
        }
      }
    }
    throw new GeminiError('other', 'The image model returned no image');
  }

  /** Cheap end-to-end check: list models and get a one-word reply. */
  async verify(): Promise<{ ok: true; model: string; count: number }> {
    const all = await this.listModels(true);
    const model = await this.run(async (m) => {
      textOf(await this.generate(m, this.body('Reply with the single word OK.', undefined, { temperature: 0 })));
      return m;
    });
    return { ok: true, model, count: all.length };
  }
}
