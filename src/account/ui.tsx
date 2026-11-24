// Building blocks shared by every account page.
import { Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { api, type LicenceKey, type Me } from './api';
import { plan as planOf } from './plans';

export type Go = (to: string) => void;

export type Theme = 'dark' | 'light';
const THEME_KEY = 'orilos.theme';

/** The saved theme for the account pages; dark unless the person picked light. */
export function savedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode: the choice lasts this visit */
  }
}
/** Switches theme with a circle that grows from (x, y) and sweeps the new theme across the screen
 *  (View Transitions). Instant when the browser lacks them or the person prefers reduced motion. */
export function switchTheme(next: Theme, x: number, y: number, commit: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  const apply = () => {
    applyTheme(next);
    flushSync(commit); // the icon must already be the new one in the "after" snapshot
  };
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply();
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.classList.add('theme-switching');
  const t = doc.startViewTransition(apply);
  t.ready
    .then(() => {
      const ease = 'cubic-bezier(0.7, 0, 0.2, 1)';
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 720, easing: ease, pseudoElement: '::view-transition-new(root)' },
      );
      document.documentElement.animate(
        { transform: ['scale(1)', 'scale(0.985)'], filter: ['brightness(1)', 'brightness(0.75)'] },
        { duration: 720, easing: ease, pseudoElement: '::view-transition-old(root)' },
      );
    })
    .catch(() => {})
    .finally(() => setTimeout(() => document.documentElement.classList.remove('theme-switching'), 760));
}

export interface Ctx {
  me: Me;
  setMe: (m: Me) => void;
  billingReady: boolean;
  go: Go;
}

export function Center({ children }: { children: ReactNode }) {
  return (
    <div className="ac ac-center">
      <img src="/mascot/attentive.gif" alt="" width="64" height="64" />
      <p>{children}</p>
    </div>
  );
}

export function Avatar({ me, size }: { me: Me; size: number }) {
  const initial = (me.name || me.email).trim().charAt(0).toUpperCase();
  return me.avatar ? (
    <img className="ac-avatar" src={me.avatar} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="ac-avatar" style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {initial}
    </span>
  );
}

export function Head({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <header className="ac-head">
      <div>
        <h1>{title}</h1>
        <p className="ac-mute">{sub}</p>
      </div>
      {children}
    </header>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`ac-card ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function CopyLine({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="ac-copy">
      <code>{text}</code>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          });
        }}
        aria-label={label ?? 'Copy'}
      >
        {done ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}

export function PlanChip({ me }: { me: Me }) {
  return <span className={`ac-chip ${me.plan}`}>{planOf(me.plan).name}</span>;
}

export function useKeys() {
  const [keys, setKeys] = useState<LicenceKey[] | null>(null);
  const reload = useCallback(() => api<{ keys: LicenceKey[] }>('/keys').then((r) => setKeys(r.keys)), []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { keys, setKeys, reload };
}

