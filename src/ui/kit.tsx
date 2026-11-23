import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { platformName } from '../lib/platforms';
import { getBlob } from '../lib/store';
import type { PlatformId, Post, PostState } from '../lib/types';

// ── Routing: #/home, #/content/<id>, … ───────────────────────────────────
const subscribeHash = (l: () => void) => {
  window.addEventListener('hashchange', l);
  return () => window.removeEventListener('hashchange', l);
};
export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribeHash, () => location.hash);
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return parts.length ? parts : ['home'];
}
export const go = (path: string) => {
  location.hash = `#/${path}`;
};

// ── Toast ────────────────────────────────────────────────────────────────
let toastMsg: string | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const toastListeners = new Set<() => void>();
export function toast(m: string) {
  toastMsg = m;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMsg = undefined;
    toastListeners.forEach((l) => l());
  }, 3200);
  toastListeners.forEach((l) => l());
}
export function Toast() {
  const m = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toastMsg,
  );
  return m ? (
    <div className="toast" role="status">
      {m}
    </div>
  ) : null;
}

// ── ORILOS's face: the cloud ────────────────────────────────────────────
// Its expression follows what ORILOS is doing: at rest (with a blink), working
// (eyes following along), done / needs you (bright-eyed), error (taken aback,
// plus a "!" — state is never shown by the face alone). Light theme shows the
// ink cloud; CSS picks the variant. Reduced motion stops the blink and uses
// the still face.
export type MarkState = 'idle' | 'working' | 'done' | 'attention' | 'error';
const FACE: Record<MarkState, string> = { idle: 'neutral', working: 'attentive', done: 'excited', attention: 'excited', error: 'surprised' };
const LABEL: Record<MarkState, string> = { idle: 'ORILOS', working: 'ORILOS is working', done: 'Done', attention: 'ORILOS needs you', error: 'Needs attention' };

export function Mark({ size = 32, state = 'idle', label }: { size?: number; state?: MarkState; label?: string }) {
  const face = FACE[state];
  const ext = face === 'attentive' ? 'gif' : 'png';
  return (
    <span className={`mark ${state}`} style={{ width: size, height: size, fontSize: size * 0.24 }} role="img" aria-label={label ?? LABEL[state]} aria-hidden={label === '' || undefined}>
      <img className="cloud" src={`/mascot/${face}.${ext}`} alt="" width={size} height={size} />
      <img className="cloud ink" src={`/mascot/${face}_ink.${ext}`} alt="" width={size} height={size} />
      {face === 'attentive' && (
        // Reduced motion: the still face instead of the animation.
        <>
          <img className="cloud still" src="/mascot/neutral.png" alt="" width={size} height={size} />
          <img className="cloud still ink" src="/mascot/neutral_ink.png" alt="" width={size} height={size} />
        </>
      )}
      {face === 'neutral' && (
        <>
          <i className="lid l" />
          <i className="lid r" />
        </>
      )}
      {state === 'error' && <span className="bang">!</span>}
    </span>
  );
}

// ── Platform badges: monochrome glyphs drawn in SVG (no brand colours) ──
function Glyph({ platform, w }: { platform: string; w: number }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: w * 0.07, strokeLinecap: 'round' as const };
  const letter = (t: string, scale: number) => (
    <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontWeight="800" fontSize={w * scale} fontFamily="Inter, Arial, sans-serif">
      {t}
    </text>
  );
  switch (platform) {
    case 'x':
      return (
        <>
          <path d={`M${w * 0.32} ${w * 0.3} L${w * 0.68} ${w * 0.7}`} {...stroke} strokeWidth={w * 0.09} />
          <path d={`M${w * 0.68} ${w * 0.3} L${w * 0.32} ${w * 0.7}`} {...stroke} strokeWidth={w * 0.06} />
        </>
      );
    case 'instagram':
      return (
        <>
          <rect x={w * 0.26} y={w * 0.26} width={w * 0.48} height={w * 0.48} rx={w * 0.14} {...stroke} />
          <circle cx={w / 2} cy={w / 2} r={w * 0.11} {...stroke} />
          <circle cx={w * 0.63} cy={w * 0.37} r={w * 0.03} fill="currentColor" />
        </>
      );
    case 'tiktok':
      return letter('♪', 0.5);
    case 'youtube':
      return (
        <>
          <rect x={w * 0.22} y={w * 0.3} width={w * 0.56} height={w * 0.4} rx={w * 0.12} {...stroke} />
          <path d={`M${w * 0.45} ${w * 0.41} L${w * 0.59} ${w * 0.5} L${w * 0.45} ${w * 0.59} Z`} fill="currentColor" />
        </>
      );
    case 'linkedin':
      return letter('in', 0.42);
    case 'threads':
      return letter('@', 0.5);
    case 'facebook':
      return letter('f', 0.56);
    case 'pinterest':
      return (
        <>
          <circle cx={w / 2} cy={w / 2} r={w * 0.25} {...stroke} />
          {letter('P', 0.3)}
        </>
      );
    case 'mastodon':
      return (
        <>
          <rect x={w * 0.25} y={w * 0.26} width={w * 0.5} height={w * 0.46} rx={w * 0.13} {...stroke} />
          {letter('m', 0.34)}
        </>
      );
    case 'reddit':
      return (
        <>
          <ellipse cx={w / 2} cy={w * 0.58} rx={w * 0.26} ry={w * 0.16} {...stroke} />
          <path d={`M${w * 0.5} ${w * 0.42} L${w * 0.57} ${w * 0.26}`} {...stroke} />
          <circle cx={w * 0.64} cy={w * 0.25} r={w * 0.045} fill="currentColor" />
          <circle cx={w * 0.42} cy={w * 0.57} r={w * 0.04} fill="currentColor" />
          <circle cx={w * 0.58} cy={w * 0.57} r={w * 0.04} fill="currentColor" />
        </>
      );
    case 'bluesky':
      return (
        <>
          <ellipse cx={w * 0.36} cy={w * 0.4} rx={w * 0.14} ry={w * 0.12} {...stroke} />
          <ellipse cx={w * 0.64} cy={w * 0.4} rx={w * 0.14} ry={w * 0.12} {...stroke} />
          <ellipse cx={w * 0.4} cy={w * 0.61} rx={w * 0.1} ry={w * 0.09} {...stroke} />
          <ellipse cx={w * 0.6} cy={w * 0.61} rx={w * 0.1} ry={w * 0.09} {...stroke} />
        </>
      );
    default:
      return <circle cx={w / 2} cy={w / 2} r={w * 0.16} {...stroke} />;
  }
}

export function PlatformBadge({ platform, size = 28 }: { platform: PlatformId | string; size?: number }) {
  return (
    <svg className="pbadge" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={platformName(platform)}>
      <rect width={size} height={size} rx={size * 0.3} className="pbadge-tile" />
      <Glyph platform={platform} w={size} />
    </svg>
  );
}

// ── Images from IndexedDB ───────────────────────────────────────────────
export function useBlobUrl(blobId?: string): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blobId) return setUrl(undefined);
    let u: string | undefined;
    let live = true;
    void getBlob(blobId).then((b) => {
      if (b && live) setUrl((u = URL.createObjectURL(b)));
    });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [blobId]);
  return url;
}

// ── Truthful post status ────────────────────────────────────────────────
export const STATUS: Record<PostState, { label: string; cls: string }> = {
  pending: { label: 'Needs approval', cls: 'warn' },
  approved: { label: 'Approved', cls: 'secondary' },
  handedOff: { label: 'Waiting for you to post', cls: 'secondary' },
  posted: { label: 'Posted', cls: 'ok' },
  skipped: { label: 'Set aside', cls: 'muted' },
};

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-title">
        <h2 className="label">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <input type="checkbox" role="switch" className="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />;
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export const firstLine = (p: Post) => p.text.split('\n').find((l) => l.trim()) ?? '';
