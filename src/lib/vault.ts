import { idbDel, idbGet, idbSet } from './db';

// The Gemini key is encrypted with AES-GCM under a NON-EXTRACTABLE CryptoKey
// that lives in IndexedDB: page code can use it but never read its bytes, and
// the key never appears in exports, localStorage or logs. ponytail: this
// protects at rest; it can't protect against code running in this page (XSS),
// which is why the built app ships a strict CSP and has no third-party scripts.

async function cryptoKey(): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>('kv', 'vault.cryptoKey');
  if (existing) return existing;
  const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await idbSet('kv', 'vault.cryptoKey', k);
  return k;
}

let cache: string | undefined;

export async function saveKey(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(), new TextEncoder().encode(secret.trim()));
  await idbSet('kv', 'vault.gemini', { iv, data });
  cache = secret.trim();
}

export async function readKey(): Promise<string | undefined> {
  if (cache) return cache;
  const box = await idbGet<{ iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer }>('kv', 'vault.gemini');
  if (!box) return undefined;
  try {
    cache = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: box.iv }, await cryptoKey(), box.data));
    return cache;
  } catch {
    return undefined;
  }
}

export async function removeKey() {
  cache = undefined;
  await idbDel('kv', 'vault.gemini');
}

/** Shape check only — Gemini decides whether the key is real. */
export const looksLikeGeminiKey = (s: string) => /^AIza[0-9A-Za-z_-]{30,}$/.test(s.trim());
