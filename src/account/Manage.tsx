// Account management: profile, billing, licence keys and settings.
import { Check } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ago, api, device, getMe, when, type LicenceKey, type Me, type Session } from './api';
import { plan as planOf, PLANS, type Interval } from './plans';
import { Avatar, Card, CopyLine, Head, useKeys, type Ctx } from './ui';

/* ── Profile ───────────────────────────────────────────────── */

const ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
})();

export function Profile({ me, setMe }: Ctx) {
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

export function Billing({ me, setMe, billingReady }: Ctx) {
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

export function Keys(_: Ctx) {
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

export function Settings({ me }: Ctx) {
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
