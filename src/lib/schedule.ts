import type { Schedule } from './types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function at(d: Date, time: string) {
  const [h, m] = time.split(':').map(Number);
  const x = new Date(d);
  x.setHours(h || 0, m || 0, 0, 0);
  return x;
}

/** The first scheduled run strictly after `after`, or undefined. */
export function nextRun(s: Schedule, after: number): number | undefined {
  if (s.kind === 'off') return undefined;
  if (s.kind === 'once') return s.onceAt && s.onceAt > after ? s.onceAt : undefined;
  const start = new Date(after);
  for (let i = 0; i < 8; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const t = at(d, s.time);
    const dow = t.getDay();
    const ok = s.kind === 'daily' || (s.kind === 'weekdays' && dow >= 1 && dow <= 5) || (s.kind === 'weekly' && dow === s.day);
    if (ok && t.getTime() > after) return t.getTime();
  }
  return undefined;
}

export function describe(s: Schedule): string {
  const time = fmtTime(at(new Date(), s.time).getTime());
  switch (s.kind) {
    case 'off':
      return 'Not scheduled';
    case 'daily':
      return `Every day at ${time}`;
    case 'weekdays':
      return `Mon–Fri at ${time}`;
    case 'weekly':
      return `Every ${DAYS[s.day]} at ${time}`;
    case 'once':
      return s.onceAt ? `Once, ${friendlyWhen(s.onceAt)}` : 'Once';
  }
}

export const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** "Today · 9:00 AM", "Tomorrow · 9:00 AM", "Thursday · 9:00 AM", "12 Oct · 9:00 AM". */
export function friendlyWhen(t: number, now = Date.now()): string {
  const d = new Date(t);
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - day0.getTime()) / 86_400_000);
  const day =
    diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : diff > 1 && diff < 7 ? DAYS[d.getDay()] : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return `${day} · ${fmtTime(t)}`;
}

export function ago(t: number, now = Date.now()): string {
  const s = Math.round((now - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return friendlyWhen(t, now);
}
