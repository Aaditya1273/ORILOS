import { useSyncExternalStore } from 'react';
import { idbDel, idbGet, idbKeys, idbSet } from './db';
import type { ActivityEntry, Post, State } from './types';

// The whole app state is one small object, kept in memory and written to
// IndexedDB on every change. Other tabs are told to reload (BroadcastChannel).
// Images are stored separately as Blobs.

export const initialState = (): State => ({
  version: 1,
  posts: [],
  activity: [],
  schedule: { kind: 'off', time: '09:00', day: 1 },
  settings: { theme: 'system', geminiImages: false, learnFromEdits: true, imageApp: 'chatgpt', notifications: false },
  focus: '',
});

let state: State = initialState();
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('orilos') : undefined;

export const newId = (prefix: string) => `${prefix}${crypto.randomUUID().slice(0, 13)}`;

export async function loadState() {
  const saved = await idbGet<State>('kv', 'state');
  state = saved ? { ...initialState(), ...saved, settings: { ...initialState().settings, ...saved.settings } } : initialState();
  listeners.forEach((l) => l());
}

channel?.addEventListener('message', (e) => {
  if (e.data === 'changed') void loadState();
});

export const getState = () => state;

export function setState(fn: (s: State) => State) {
  state = fn(state);
  listeners.forEach((l) => l());
  void idbSet('kv', 'state', state).then(() => channel?.postMessage('changed'));
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
  );
}

export function log(e: Omit<ActivityEntry, 'id' | 'at'>) {
  setState((s) => ({ ...s, activity: [{ ...e, id: newId('a_'), at: Date.now() }, ...s.activity].slice(0, 300) }));
}

export function updatePost(id: string, patch: Partial<Post>) {
  setState((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)) }));
}

// ── Images ──────────────────────────────────────────────────────────────

export async function saveBlob(blob: Blob): Promise<string> {
  const id = newId('img_');
  await idbSet('blobs', id, blob);
  return id;
}

export const getBlob = (id: string) => idbGet<Blob>('blobs', id);

/** Drop images no post refers to any more. */
export async function pruneBlobs() {
  const used = new Set(state.posts.map((p) => p.image?.blobId).filter(Boolean));
  for (const k of await idbKeys('blobs')) if (!used.has(String(k))) await idbDel('blobs', String(k));
}
