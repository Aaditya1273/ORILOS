import { useSyncExternalStore } from 'react';
import { buildBrain, runOnce } from './agent';
import { Gemini, GeminiError } from './gemini';
import { friendlyWhen, nextRun } from './schedule';
import { getState, log, setState } from './store';
import type { Phase } from './types';
import { readKey } from './vault';

export const ai = new Gemini(readKey);

export interface RunStatus {
  running: boolean;
  kind?: 'run' | 'brain';
  phase?: Phase;
  note?: string;
  error?: string;
  startedAt?: number;
}

let status: RunStatus = { running: false };
let controller: AbortController | undefined;
const listeners = new Set<() => void>();

function set(s: RunStatus) {
  status = s;
  listeners.forEach((l) => l());
}

export const useRun = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );

/** Plain-language failure for the user; details stay in Activity. */
export function friendly(e: unknown): string {
  if (e instanceof GeminiError) {
    switch (e.kind) {
      case 'auth':
        return e.message;
      case 'quota':
        return e.daily ? 'Today’s free Gemini allowance is used up. ORILOS can try again tomorrow.' : 'Gemini asked ORILOS to slow down. Try again in a minute.';
      case 'network':
        return 'ORILOS couldn’t reach Gemini. Check your connection.';
      case 'overloaded':
        return 'Gemini is busy right now. Try again in a few minutes.';
      case 'cancelled':
        return 'Stopped.';
      default:
        return 'Something got in the way. Details are in Activity.';
    }
  }
  return 'Something got in the way. Details are in Activity.';
}

export function stop() {
  controller?.abort();
}

export async function startRun(reason: 'manual' | 'schedule' = 'manual') {
  if (status.running) return;
  controller = new AbortController();
  set({ running: true, kind: 'run', phase: 'research', note: 'Starting', startedAt: Date.now() });
  try {
    const r = await runOnce(ai, (phase, note) => set({ ...status, phase, note }), controller.signal);
    log({
      kind: 'run',
      title: 'ORILOS completed a run',
      detail: `${r.posts.length} post${r.posts.length === 1 ? '' : 's'} ready for review${reason === 'schedule' ? ' · scheduled' : ''}${r.warnings.length ? ` · ${r.warnings.join(' · ')}` : ''}`,
      ok: true,
    });
    notify(`${r.posts.length} post${r.posts.length === 1 ? ' is' : 's are'} ready`, 'Review and approve them in ORILOS.');
    set({ running: false, phase: 'done' });
  } catch (e) {
    const cancelled = e instanceof GeminiError && e.kind === 'cancelled';
    if (!cancelled) log({ kind: 'error', title: 'A run didn’t finish', detail: (e as Error).message, ok: false });
    set({ running: false, error: cancelled ? undefined : friendly(e) });
  }
}

export async function rebuildBrain() {
  const ws = getState().workspace;
  if (!ws || status.running) return;
  controller = new AbortController();
  set({ running: true, kind: 'brain', phase: 'brain', note: 'Starting', startedAt: Date.now() });
  try {
    const brain = await buildBrain(ai, ws, (phase, note) => set({ ...status, phase, note }), controller.signal);
    setState((s) => ({ ...s, brain }));
    log({ kind: 'brain', title: 'Brand Brain ready', detail: brain.one_liner, ok: true });
    set({ running: false, phase: 'done' });
  } catch (e) {
    const cancelled = e instanceof GeminiError && e.kind === 'cancelled';
    if (!cancelled) log({ kind: 'error', title: 'Brand Brain didn’t finish', detail: (e as Error).message, ok: false });
    set({ running: false, error: cancelled ? undefined : friendly(e) });
  }
}

export const clearError = () => set({ ...status, error: undefined });

function notify(title: string, body: string) {
  if (!getState().settings.notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  new Notification(title, { body, icon: '/logo.png', tag: 'orilos-ready' });
}

// ── Scheduler ────────────────────────────────────────────────────────────
// Runs while any ORILOS tab is open. A Web Lock makes exactly one tab the
// scheduler, so two open tabs never run twice. A run missed while the browser
// was closed is caught up once if it is less than 12 h old.

const CATCH_UP_MS = 12 * 3600_000;

function tick() {
  const s = getState();
  const sch = s.schedule;
  if (sch.kind === 'off' || !s.workspace || status.running) return;
  const now = Date.now();
  const due = nextRun(sch, sch.lastRunAt ?? now);
  if (due === undefined || due > now) return;
  setState((st) => ({ ...st, schedule: { ...st.schedule, lastRunAt: now, ...(st.schedule.kind === 'once' ? { kind: 'off' as const } : {}) } }));
  if (now - due > CATCH_UP_MS) {
    log({ kind: 'schedule', title: 'Missed a scheduled run', detail: `${friendlyWhen(due)} — the browser was closed`, ok: false });
    return;
  }
  void startRun('schedule');
}

export function startScheduler() {
  const loop = () => {
    tick();
    return setInterval(tick, 30_000);
  };
  if (navigator.locks) {
    void navigator.locks.request('orilos-scheduler', () => {
      loop();
      return new Promise(() => {}); // hold the lock for the life of this tab
    });
  } else {
    loop();
  }
}
