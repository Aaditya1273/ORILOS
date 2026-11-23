// The ORILOS account: dashboard, profile, billing, licence keys and settings at /account/*.
import { ArrowRight, Check, Copy, CreditCard, KeyRound, LayoutDashboard, LogOut, Settings as Cog, User as UserIcon, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ago, api, ApiError, device, getMe, when, type LicenceKey, type Me, type Session } from './api';
import { Brand } from './Chrome';
import { plan as planOf, PLANS, type Interval } from './plans';
import './account.css';

const TABS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '/account', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/account/profile', label: 'Profile', icon: UserIcon },
  { path: '/account/billing', label: 'Billing', icon: CreditCard },
  { path: '/account/keys', label: 'Keys', icon: KeyRound },
  { path: '/account/settings', label: 'Settings', icon: Cog },
];

type Go = (to: string) => void;
interface Ctx {
  me: Me;
  setMe: (m: Me) => void;
  billingReady: boolean;
  go: Go;
}

function usePath(): [string, Go] {
  const [path, setPath] = useState(location.pathname.replace(/\/+$/, ''));
  useEffect(() => {
    const sync = () => setPath(location.pathname.replace(/\/+$/, ''));
    addEventListener('popstate', sync);
    return () => removeEventListener('popstate', sync);
  }, []);
  const go = useCallback((to: string) => {
    history.pushState(null, '', to);
    setPath(new URL(to, location.origin).pathname.replace(/\/+$/, ''));
    scrollTo(0, 0);
  }, []);
  return [path, go];
}

export function Account() {
  const [path, go] = usePath();
  const [state, setState] = useState<{ me: Me; billingReady: boolean } | null>(null);
  const [down, setDown] = useState('');

  useEffect(() => {
    getMe().then(
      (r) => setState({ me: r.user, billingReady: r.billingReady }),
      (e) => {
        if (e instanceof ApiError && e.status === 401) location.replace(`/signin?next=${encodeURIComponent(location.pathname + location.search)}`);
        else setDown(e.message);
      },
    );
  }, []);

  if (down) return <Center>{down}</Center>;
  if (!state) return <Center>Loading your account…</Center>;

  const ctx: Ctx = { me: state.me, billingReady: state.billingReady, setMe: (me) => setState({ ...state, me }), go };
  const tab = TABS.find((t) => t.path === path) ?? TABS[0];
  const signOut = async () => {
    await api('/auth/signout', { method: 'POST' }).catch(() => {});
    location.href = '/';
  };

  return (
    <div className="ac ac-app">
      <aside className="ac-side">
        <Brand />
        <nav aria-label="Account">
          {TABS.map((t) => (
            <a
              key={t.path}
              href={t.path}
              aria-current={t === tab ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(t.path);
              }}
            >
              <t.icon size={18} aria-hidden="true" />
              {t.label}
            </a>
          ))}
        </nav>
        <div className="ac-side-foot">
          <div className="ac-who">
            <Avatar me={state.me} size={32} />
            <span>
              <b>{state.me.name || 'You'}</b>
              <small>{state.me.email}</small>
            </span>
          </div>
          <button className="ac-link" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <main className="ac-main" id="main">
        {tab.path === '/account' && <Dashboard {...ctx} />}
        {tab.path === '/account/profile' && <Profile {...ctx} />}
        {tab.path === '/account/billing' && <Billing {...ctx} />}
        {tab.path === '/account/keys' && <Keys {...ctx} />}
        {tab.path === '/account/settings' && <Settings {...ctx} />}
      </main>
    </div>
  );
}

/* ── Bits ──────────────────────────────────────────────────── */

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="ac ac-center">
      <img src="/mascot/attentive.gif" alt="" width="64" height="64" />
      <p>{children}</p>
    </div>
  );
}

function Avatar({ me, size }: { me: Me; size: number }) {
  const initial = (me.name || me.email).trim().charAt(0).toUpperCase();
  return me.avatar ? (
    <img className="ac-avatar" src={me.avatar} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="ac-avatar" style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {initial}
    </span>
  );
}

function Head({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
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

function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`ac-card ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

function CopyLine({ text, label }: { text: string; label?: string }) {
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

function PlanChip({ me }: { me: Me }) {
  return <span className={`ac-chip ${me.plan}`}>{planOf(me.plan).name}</span>;
}

function useKeys() {
  const [keys, setKeys] = useState<LicenceKey[] | null>(null);
  const reload = useCallback(() => api<{ keys: LicenceKey[] }>('/keys').then((r) => setKeys(r.keys)), []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { keys, setKeys, reload };
}

/* ── Dashboard ─────────────────────────────────────────────── */

function Dashboard({ me, go }: Ctx) {
  const { keys } = useKeys();
  const first = (me.name || '').split(' ')[0];
  const activated = keys?.some((k) => k.usedAt) ?? false;
  const steps = [
    { done: true, title: 'Make your account', text: 'Done. Welcome to ORILOS.' },
    { done: (keys?.length ?? 0) > 0, title: 'Create a licence key', text: 'One per computer you clip on.', to: '/account/keys' },
    { done: activated, title: 'Install and activate', text: 'Two commands in any terminal.', to: '/account/keys' },
    { done: activated, title: 'Clip your first video', text: 'Tell your AI "clip this" and paste a link.', href: '/docs/first-clip' },
  ];
  const lastUsed = keys?.reduce((m, k) => Math.max(m, k.usedAt ?? 0), 0) || null;
  const sub = me.subscription;

  return (
    <>
      <Head title={first ? `Hi, ${first}` : 'Your dashboard'} sub="Long in. Short out. Here is everything in one place.">
        <PlanChip me={me} />
      </Head>

      {me.plan === 'free' && (
        <a
          className="ac-promo"
          href="/account/billing"
          onClick={(e) => {
            e.preventDefault();
            go('/account/billing');
          }}
        >
          <span>
            <b>Go Pro</b> for all 67 caption styles, brand kits, best-time scheduling and Autopilot.
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      )}

      <div className="ac-stats">
        <Card>
          <p className="ac-stat-label">Plan</p>
          <p className="ac-stat">{planOf(me.plan).name}</p>
          <p className="ac-fine">{sub?.renewsAt ? `Renews ${when(sub.renewsAt, me.timezone)}` : sub?.endsAt ? `Ends ${when(sub.endsAt, me.timezone)}` : 'Free forever'}</p>
        </Card>
        <Card>
          <p className="ac-stat-label">Licence keys</p>
          <p className="ac-stat">{keys ? keys.length : '…'}</p>
          <p className="ac-fine">{lastUsed ? `Last used ${ago(lastUsed)}` : 'Not used yet'}</p>
        </Card>
        <Card>
          <p className="ac-stat-label">Member since</p>
          <p className="ac-stat">{new Date(me.createdAt * 1000).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</p>
          <p className="ac-fine">{me.email}</p>
        </Card>
      </div>

      <div className="ac-grid2">
        <Card title="Get started">
          <ol className="ac-steps">
            {steps.map((s, i) => (
              <li key={s.title} className={s.done ? 'done' : ''}>
                <span className="ac-step-n">{s.done ? <Check size={14} /> : i + 1}</span>
                <span>
                  <b>{s.title}</b>
                  <small>{s.text}</small>
                </span>
                {!s.done && s.to && (
                  <button className="ac-link" onClick={() => go(s.to!)}>
                    Open <ArrowRight size={14} />
                  </button>
                )}
                {!s.done && s.href && (
                  <a className="ac-link" href={s.href}>
                    Guide <ArrowRight size={14} />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Install ORILOS">
          <p className="ac-mute">Connects ORILOS to Claude Code, Codex, Claude Desktop, Cursor and Windsurf on this computer.</p>
          <CopyLine text="uvx orilos-mcp install" />
          <p className="ac-fine">
            No uv yet? <a href="/docs/quickstart">Get it in one line</a>. Then in your AI app: <code>clip this https://youtube.com/watch?v=…</code>
          </p>
        </Card>
      </div>

      <div className="ac-links">
        {[
          ['Quickstart', '/docs/quickstart'],
          ['Caption styles', '/docs/captions'],
          ['Autopilot', '/docs/autopilot'],
          ['Posting and scheduling', '/docs/scheduling'],
        ].map(([label, href]) => (
          <a key={href} href={href}>
            {label} <ArrowRight size={14} aria-hidden="true" />
          </a>
        ))}
      </div>
    </>
  );
}

/* ── Profile ───────────────────────────────────────────────── */

const ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
})();

function Profile({ me, setMe }: Ctx) {
  const [form, setForm] = useState({ name: me.name, handle: me.handle ?? '', timezone: me.timezone });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = form.name !== me.name || form.handle !== (me.handle ?? '') || form.timezone !== me.timezone;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ user: Me }>('/me', { method: 'PATCH', body: form });
      setMe(r.user);
      setStatus({ ok: true, text: 'Saved.' });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head title="Profile" sub="How you appear in ORILOS." />
      <Card>
        <div className="ac-profile-top">
          <Avatar me={me} size={72} />
          <div>
            <p className="ac-stat">{me.name || 'You'}</p>
            <p className="ac-mute">{me.email}</p>
            <p className="ac-fine">Signed in with Google. Your photo comes from your Google account.</p>
          </div>
        </div>
        <form className="ac-form" onSubmit={save}>
          <label>
            <span>Name</span>
            <input value={form.name} maxLength={60} required onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </label>
          <label>
            <span>Handle</span>
            <div className="ac-prefix">
              <i>@</i>
              <input
                value={form.handle}
                maxLength={24}
                pattern="[a-zA-Z0-9_]{3,24}"
                placeholder="yourname"
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                autoComplete="username"
              />
            </div>
            <small>3 to 24 letters, numbers or underscores.</small>
          </label>
          <label>
            <span>Time zone</span>
            <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              {(ZONES.includes(form.timezone) ? ZONES : [form.timezone, ...ZONES]).map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
            <small>Used for dates here and for best-time posting.</small>
          </label>
          <label>
            <span>Email</span>
            <input value={me.email} disabled />
            <small>Managed by Google.</small>
          </label>
          <div className="ac-actions">
            <button className="ac-btn pink" disabled={!dirty || busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            {form.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
              <button type="button" className="ac-link" onClick={() => setForm({ ...form, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>
                Use this device's time zone
              </button>
            )}
            {status && (
              <span className={status.ok ? 'ac-ok' : 'ac-err'} role="status">
                {status.text}
              </span>
            )}
          </div>
        </form>
      </Card>
    </>
  );
}

/* ── Billing ───────────────────────────────────────────────── */

const STATUS: Record<string, string> = {
  active: 'Active',
  on_trial: 'Trial',
  past_due: 'Payment failed: update your card',
  cancelled: 'Cancelled: runs until the end of the period',
  expired: 'Expired',
  unpaid: 'Unpaid',
  paused: 'Paused',
};

function Billing({ me, setMe, billingReady }: Ctx) {
  const params = new URLSearchParams(location.search);
  const [interval, setInterval] = useState<Interval>(params.get('interval') === 'monthly' ? 'monthly' : 'yearly');
  const wanted = params.get('plan');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(params.get('paid') === '1' && me.plan === 'free');

  // Back from the payment page: the webhook usually lands within seconds.
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const t = window.setInterval(async () => {
      tries++;
      const r = await getMe().catch(() => null);
      if (r && r.user.plan !== 'free') {
        setMe(r.user);
        setWaiting(false);
      } else if (tries >= 15) setWaiting(false);
    }, 2000);
    return () => clearInterval(t);
  }, [waiting, setMe]);

  const open = async (what: 'checkout' | 'portal', planId?: string) => {
    setBusy(planId ?? what);
    setError('');
    try {
      const r = await api<{ url: string }>(`/billing/${what}`, { method: 'POST', body: what === 'checkout' ? { plan: planId, interval } : {} });
      location.href = r.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy('');
    }
  };

  const sub = me.subscription;
  const current = planOf(me.plan);
  return (
    <>
      <Head title="Billing" sub="Your plan, payments and invoices." />
      {params.get('paid') === '1' && (
        <p className={waiting ? 'ac-alert' : 'ac-alert ok'} role="status">
          {waiting ? 'Payment received. Turning on your plan…' : me.plan !== 'free' ? `Welcome to ${current.name}. Thank you!` : 'Payment received. Your plan will appear here in a minute.'}
        </p>
      )}
      {error && (
        <p className="ac-alert" role="alert">
          {error}
        </p>
      )}

      <Card className="ac-current">
        <div>
          <p className="ac-stat-label">Current plan</p>
          <p className="ac-stat">
            {current.name} {me.plan !== 'free' && <span className="ac-mute">· {sub?.interval === 'yearly' ? 'yearly' : 'monthly'}</span>}
          </p>
          <p className="ac-fine">
            {sub
              ? `${STATUS[sub.status] ?? sub.status}${sub.renewsAt && sub.status !== 'cancelled' ? ` · renews ${when(sub.renewsAt, me.timezone)}` : ''}${sub.endsAt ? ` · ends ${when(sub.endsAt, me.timezone)}` : ''}`
              : 'Free forever. No card on file.'}
          </p>
        </div>
        {sub && (
          <button className="ac-btn" onClick={() => open('portal')} disabled={!!busy}>
            {busy === 'portal' ? 'Opening…' : 'Manage billing'}
          </button>
        )}
      </Card>

      {!sub || !['active', 'on_trial', 'past_due', 'cancelled'].includes(sub.status) ? (
        <>
          <div className="ac-row">
            <h2 className="ac-h3">Upgrade</h2>
            <div className="ac-toggle small" role="radiogroup" aria-label="Billing period">
              {(['monthly', 'yearly'] as const).map((i) => (
                <button key={i} role="radio" aria-checked={interval === i} className={interval === i ? 'on' : ''} onClick={() => setInterval(i)}>
                  {i === 'monthly' ? 'Monthly' : 'Yearly · 2 months free'}
                </button>
              ))}
            </div>
          </div>
          <div className="ac-upgrades">
            {PLANS.filter((p) => p.id !== 'free').map((p) => (
              <Card key={p.id} className={`ac-up${wanted === p.id || (!wanted && p.id === 'pro') ? ' hot' : ''}`}>
                <h2>{p.name}</h2>
                <p className="ac-price">
                  <b>${p.price[interval]}</b>
                  <span>/ month</span>
                </p>
                <p className="ac-fine">{interval === 'yearly' ? `$${p.price.yearly * 12} billed yearly` : 'Billed monthly'}</p>
                <ul className="ac-feats">
                  {p.features.slice(1, 5).map((f) => (
                    <li key={f}>
                      <Check size={16} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="ac-btn pink wide" disabled={!billingReady || !!busy} onClick={() => open('checkout', p.id)}>
                  {!billingReady ? 'Payments open soon' : busy === p.id ? 'Opening checkout…' : `Upgrade to ${p.name}`}
                </button>
              </Card>
            ))}
          </div>
          <p className="ac-fine">
            Secure checkout by Lemon Squeezy. Cancel any time. <a href="/pricing">Compare plans</a>
          </p>
        </>
      ) : (
        <Card title="Invoices and payment method">
          <p className="ac-mute">Download invoices, change your card, switch between Pro and Team, or cancel, all from Manage billing.</p>
        </Card>
      )}
    </>
  );
}

/* ── Keys ──────────────────────────────────────────────────── */

function Keys(_: Ctx) {
  const { keys, setKeys } = useKeys();
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { key, ...row } = await api<LicenceKey & { key: string }>('/keys', { method: 'POST', body: { name } });
      setFresh(key);
      setName('');
      setKeys([row, ...(keys ?? [])]);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const revoke = async (id: string) => {
    await api(`/keys/${id}`, { method: 'DELETE' });
    setKeys((keys ?? []).filter((k) => k.id !== id));
    setConfirm('');
  };

  return (
    <>
      <Head title="Keys" sub="Licence keys connect ORILOS on your computer to this account." />

      {fresh && (
        <Card className="ac-fresh">
          <h2>Your new key</h2>
          <p className="ac-mute">Copy it now. For your safety we only show it once.</p>
          <CopyLine text={fresh} label="Copy key" />
          <p className="ac-stat-label">Then run this on that computer</p>
          <CopyLine text={`uvx orilos-mcp activate ${fresh}`} label="Copy command" />
          <button className="ac-link" onClick={() => setFresh(null)}>
            I saved it
          </button>
        </Card>
      )}

      <Card title="Create a key">
        <form className="ac-inline" onSubmit={create}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Name it after the computer, like Studio PC" aria-label="Key name" />
          <button className="ac-btn pink">Create key</button>
        </form>
        {error && <p className="ac-err">{error}</p>}
      </Card>

      <Card title="Your keys">
        {!keys ? (
          <p className="ac-mute">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="ac-mute">No keys yet. Create one above for each computer you clip on.</p>
        ) : (
          <div className="ac-table" role="table">
            <div role="row" className="ac-tr head">
              <span role="columnheader">Name</span>
              <span role="columnheader">Key</span>
              <span role="columnheader">Created</span>
              <span role="columnheader">Last used</span>
              <span role="columnheader" />
            </div>
            {keys.map((k) => (
              <div role="row" className="ac-tr" key={k.id}>
                <span role="cell">
                  <b>{k.name}</b>
                  {k.device && <small>{k.device}</small>}
                </span>
                <span role="cell">
                  <code>{k.prefix}…</code>
                </span>
                <span role="cell">{when(k.createdAt)}</span>
                <span role="cell">{ago(k.usedAt)}</span>
                <span role="cell" className="ac-end">
                  {confirm === k.id ? (
                    <>
                      <button className="ac-btn danger small" onClick={() => revoke(k.id)}>
                        Revoke
                      </button>
                      <button className="ac-link" onClick={() => setConfirm('')}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button className="ac-link" onClick={() => setConfirm(k.id)}>
                      Revoke
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Your AI and platform keys stay on your computer">
        <p className="ac-mute">
          Gemini, ElevenLabs, Tavus, Upload-Post, Instagram and YouTube keys never come to ORILOS. Add them on your computer: ask your AI to run{' '}
          <code>setup</code> and it opens a private page there. They go into your system keychain.
        </p>
      </Card>
    </>
  );
}

/* ── Settings ──────────────────────────────────────────────── */

function Settings({ me }: Ctx) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => api<{ sessions: Session[] }>('/sessions').then((r) => setSessions(r.sessions)), []);
  useEffect(() => {
    void load();
  }, [load]);

  const end = async (id?: string) => {
    await api(id ? `/sessions/${id}` : '/sessions', { method: 'DELETE' });
    void load();
  };
  const remove = async () => {
    setError('');
    try {
      await api('/me', { method: 'DELETE' });
      location.href = '/?deleted=1';
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <Head title="Settings" sub="Security, your data and your account." />

      <Card title="Where you're signed in">
        {!sessions ? (
          <p className="ac-mute">Loading…</p>
        ) : (
          <ul className="ac-sessions">
            {sessions.map((s) => (
              <li key={s.id}>
                <span>
                  <b>{device(s.agent)}</b>
                  {s.current && <span className="ac-chip pro">This device</span>}
                  <small>
                    {s.country && `${s.country} · `}Signed in {when(s.createdAt, me.timezone)} · active {ago(s.seenAt)}
                  </small>
                </span>
                {!s.current && (
                  <button className="ac-link" onClick={() => end(s.id)}>
                    Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {sessions && sessions.length > 1 && (
          <button className="ac-btn" onClick={() => end()}>
            Sign out everywhere else
          </button>
        )}
      </Card>

      <Card title="Your data">
        <p className="ac-mute">Download everything ORILOS stores about your account as one JSON file. Your videos and clips are never on our side.</p>
        <a className="ac-btn" href="/api/export" download>
          Download my data
        </a>
      </Card>

      <Card title="Delete account" className="ac-danger">
        <p className="ac-mute">
          This deletes your account and revokes every licence key at once. ORILOS keeps working on your computers on the Free plan. This cannot be undone.
        </p>
        <form
          className="ac-inline"
          onSubmit={(e) => {
            e.preventDefault();
            void remove();
          }}
        >
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" />
          <button className="ac-btn danger" disabled={typed !== 'DELETE'}>
            Delete my account
          </button>
        </form>
        {error && <p className="ac-err">{error}</p>}
      </Card>
    </>
  );
}
