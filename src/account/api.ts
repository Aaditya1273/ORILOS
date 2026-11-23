// The browser side of the ORILOS account API (functions/api). Same origin, session cookie.
import type { Interval, PlanId } from './plans';

export interface Me {
  id: string;
  email: string;
  name: string;
  avatar: string;
  handle: string | null;
  timezone: string;
  createdAt: number;
  plan: PlanId;
  subscription: { status: string; interval: Interval; renewsAt: number | null; endsAt: number | null } | null;
}
export interface LicenceKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  usedAt: number | null;
  device: string;
}
export interface Session {
  id: string;
  createdAt: number;
  seenAt: number;
  agent: string;
  country: string;
  current: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.message ?? 'Something went wrong. Try again.');
  return data as T;
}

export const getMe = () => api<{ user: Me; billingReady: boolean }>('/me');
export const signInUrl = (next: string) => `/api/auth/google?next=${encodeURIComponent(next)}`;

export const when = (epoch: number | null, tz?: string) =>
  epoch ? new Date(epoch * 1000).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz }) : 'Never';

export function ago(epoch: number | null): string {
  if (!epoch) return 'Never';
  const s = Math.max(0, Date.now() / 1000 - epoch);
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

/** "Chrome on macOS" from a user-agent string. Good enough to recognise your own devices. */
export function device(agent: string): string {
  const browser = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'Browser';
  const os = /iPhone|iPad/.test(agent) ? 'iOS' : /Android/.test(agent) ? 'Android' : /Mac OS X/.test(agent) ? 'macOS' : /Windows/.test(agent) ? 'Windows' : /Linux/.test(agent) ? 'Linux' : 'unknown';
  return `${browser} on ${os}`;
}
